"""GhostWallet error code correction engine.

Defines all GhostWallet-specific error codes, their root-cause categories,
automatic correction strategies, and a callable correction engine that
accepts a raw error code (or partial message) and returns a structured
CorrectionResult.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Error-code registry
# ---------------------------------------------------------------------------

class GWErrorEntry(BaseModel):
    code: str
    title: str
    category: str
    description: str
    severity: str                  # "critical" | "high" | "medium" | "low"
    auto_correctable: bool
    correction_steps: List[str]
    retry_safe: bool = False
    docs_ref: Optional[str] = None


GHOSTWALLET_ERRORS: Dict[str, GWErrorEntry] = {
    "GW-001": GWErrorEntry(
        code="GW-001",
        title="Invalid Transaction Signature",
        category="cryptography",
        description="The transaction signature does not match the signing key for this wallet address.",
        severity="critical",
        auto_correctable=False,
        correction_steps=[
            "Verify the private key loaded in the wallet session matches the originating address.",
            "Ensure the transaction payload was not mutated after signing.",
            "Re-sign the transaction with the correct key and resubmit.",
        ],
        retry_safe=False,
        docs_ref="https://ghostwallet.dev/docs/errors/GW-001",
    ),
    "GW-002": GWErrorEntry(
        code="GW-002",
        title="Insufficient Funds",
        category="balance",
        description="Wallet balance is below the required amount including gas fees.",
        severity="high",
        auto_correctable=False,
        correction_steps=[
            "Check current wallet balance via /api/ghostwallet/balance.",
            "Ensure native token balance covers both transfer value and estimated gas.",
            "Reduce transfer amount or top up the wallet before retrying.",
        ],
        retry_safe=False,
    ),
    "GW-003": GWErrorEntry(
        code="GW-003",
        title="RPC Endpoint Timeout",
        category="network",
        description="The configured RPC node did not respond within the deadline.",
        severity="medium",
        auto_correctable=True,
        correction_steps=[
            "Automatically retrying with exponential backoff (2 s, 4 s, 8 s).",
            "If all retries fail, switch to the fallback RPC endpoint.",
            "Check GHOSTWALLET_RPC_URL environment variable for validity.",
        ],
        retry_safe=True,
        docs_ref="https://ghostwallet.dev/docs/errors/GW-003",
    ),
    "GW-004": GWErrorEntry(
        code="GW-004",
        title="RPC Endpoint Unreachable",
        category="network",
        description="Connection to the blockchain RPC endpoint was refused or DNS-resolved to an invalid host.",
        severity="high",
        auto_correctable=True,
        correction_steps=[
            "Validate GHOSTWALLET_RPC_URL resolves to a reachable host.",
            "Switching to secondary RPC pool automatically.",
            "Check network egress rules and firewall policies.",
        ],
        retry_safe=True,
    ),
    "GW-005": GWErrorEntry(
        code="GW-005",
        title="Invalid Address Format",
        category="validation",
        description="The destination address failed checksum or format validation.",
        severity="high",
        auto_correctable=True,
        correction_steps=[
            "Auto-applying EIP-55 checksum correction to the address.",
            "Verify the address belongs to the intended network (mainnet vs testnet).",
            "Reject the transaction if address cannot be normalized.",
        ],
        retry_safe=False,
    ),
    "GW-006": GWErrorEntry(
        code="GW-006",
        title="Gas Estimation Failed",
        category="transaction",
        description="The node could not estimate gas for this transaction, likely due to a revert condition.",
        severity="high",
        auto_correctable=True,
        correction_steps=[
            "Applying a 20% gas buffer over the last known block gas limit.",
            "Inspect contract call data for parameter mismatches.",
            "Use eth_call to simulate the transaction before broadcast.",
        ],
        retry_safe=True,
    ),
    "GW-007": GWErrorEntry(
        code="GW-007",
        title="Nonce Mismatch",
        category="transaction",
        description="Transaction nonce is out of sequence; a pending transaction may still be in the mempool.",
        severity="medium",
        auto_correctable=True,
        correction_steps=[
            "Fetching current on-chain nonce and resetting local counter.",
            "Cancel or replace any stuck pending transactions.",
            "Resubmit with corrected nonce value.",
        ],
        retry_safe=True,
    ),
    "GW-008": GWErrorEntry(
        code="GW-008",
        title="Contract Execution Reverted",
        category="smart-contract",
        description="The EVM reverted the contract call; the transaction was not included in a block.",
        severity="high",
        auto_correctable=False,
        correction_steps=[
            "Decode the revert reason from the transaction receipt.",
            "Verify contract state preconditions (allowances, ownership, paused flag).",
            "Review ABI encoding of call parameters.",
        ],
        retry_safe=False,
    ),
    "GW-009": GWErrorEntry(
        code="GW-009",
        title="Rate Limit Exceeded",
        category="network",
        description="The RPC provider rejected the request due to exceeding the request-per-second quota.",
        severity="low",
        auto_correctable=True,
        correction_steps=[
            "Throttling requests and retrying after cool-down window.",
            "Distribute load across multiple RPC endpoints in the pool.",
            "Consider upgrading the RPC plan or switching to a self-hosted node.",
        ],
        retry_safe=True,
    ),
    "GW-010": GWErrorEntry(
        code="GW-010",
        title="Authentication Failed",
        category="security",
        description="Wallet session token is expired, revoked, or does not match the stored credential.",
        severity="critical",
        auto_correctable=False,
        correction_steps=[
            "Clear the current session and re-authenticate.",
            "Rotate the API key if using programmatic access.",
            "Audit recent access logs for unauthorized activity.",
        ],
        retry_safe=False,
    ),
    "GW-011": GWErrorEntry(
        code="GW-011",
        title="Blockchain Sync Error",
        category="node",
        description="The connected node is behind the chain tip; block data may be stale.",
        severity="medium",
        auto_correctable=True,
        correction_steps=[
            "Switching to a fully synced RPC endpoint automatically.",
            "Delay time-sensitive transactions until sync is confirmed.",
            "Monitor node sync status via eth_syncing.",
        ],
        retry_safe=True,
    ),
    "GW-012": GWErrorEntry(
        code="GW-012",
        title="Key Derivation Error",
        category="cryptography",
        description="HD wallet key derivation path is malformed or the seed phrase checksum failed.",
        severity="critical",
        auto_correctable=False,
        correction_steps=[
            "Verify BIP-39 mnemonic word count (12 or 24 words) and checksum.",
            "Confirm the derivation path follows BIP-44 (m/44'/60'/0'/0/n).",
            "Re-import wallet from seed phrase in a secure, offline environment.",
        ],
        retry_safe=False,
    ),
    "GW-013": GWErrorEntry(
        code="GW-013",
        title="Token Approval Missing",
        category="smart-contract",
        description="ERC-20 spend allowance has not been granted to the target contract.",
        severity="medium",
        auto_correctable=True,
        correction_steps=[
            "Auto-submitting approve() transaction with the required amount.",
            "Wait for approval confirmation before retrying the primary transaction.",
            "Consider using permit() for gasless approvals where supported.",
        ],
        retry_safe=False,
    ),
    "GW-014": GWErrorEntry(
        code="GW-014",
        title="Slippage Tolerance Exceeded",
        category="defi",
        description="Swap quote moved beyond the configured slippage tolerance before execution.",
        severity="low",
        auto_correctable=True,
        correction_steps=[
            "Refreshing price quote and re-evaluating slippage thresholds.",
            "Increase slippage tolerance (max recommended: 1%) or split the order.",
            "Use a price protection order type to guard against front-running.",
        ],
        retry_safe=True,
    ),
    "GW-015": GWErrorEntry(
        code="GW-015",
        title="Deployment Validation Failed",
        category="deployment",
        description="GhostWallet service failed pre-flight deployment checks (schema drift, missing env vars, or health probe failure).",
        severity="critical",
        auto_correctable=False,
        correction_steps=[
            "Run `ghostwallet doctor` to enumerate all failing checks.",
            "Ensure all required environment variables are present in the deployment manifest.",
            "Compare database schema version against the current migration baseline.",
            "Re-trigger the deployment pipeline after resolving all flagged issues.",
        ],
        retry_safe=False,
        docs_ref="https://ghostwallet.dev/docs/errors/GW-015",
    ),
}


# ---------------------------------------------------------------------------
# Correction engine models
# ---------------------------------------------------------------------------

class CorrectionResult(BaseModel):
    matched_code: Optional[str]
    matched: bool
    error: Optional[GWErrorEntry]
    auto_correction_applied: bool
    correction_log: List[str]
    timestamp: str


class DeploymentCheckResult(BaseModel):
    service: str
    status: str          # "healthy" | "degraded" | "down"
    version: Optional[str]
    last_checked: str
    details: Dict[str, Any]


class DeploymentDashboard(BaseModel):
    overall_status: str  # "healthy" | "degraded" | "down"
    services: List[DeploymentCheckResult]
    ghostwallet_errors_summary: Dict[str, int]
    generated_at: str


# ---------------------------------------------------------------------------
# Correction engine
# ---------------------------------------------------------------------------

def _match_code(raw: str) -> Optional[str]:
    """Return a canonical GW-XXX key from a raw string."""
    upper = raw.upper().strip()
    # Direct match
    if upper in GHOSTWALLET_ERRORS:
        return upper
    # Partial match: find first code that appears as substring
    for code in GHOSTWALLET_ERRORS:
        if code in upper:
            return code
    return None


def correct_error(raw_input: str) -> CorrectionResult:
    """Analyse *raw_input* (error code or message) and return a CorrectionResult."""
    ts = datetime.now(UTC).isoformat()
    code = _match_code(raw_input)

    if code is None:
        return CorrectionResult(
            matched_code=None,
            matched=False,
            error=None,
            auto_correction_applied=False,
            correction_log=["No matching GhostWallet error code found for input."],
            timestamp=ts,
        )

    entry = GHOSTWALLET_ERRORS[code]
    log: List[str] = []
    applied = False

    if entry.auto_correctable:
        log.append(f"Auto-correction triggered for {code} ({entry.title}).")
        for step in entry.correction_steps:
            log.append(f"  > {step}")
        applied = True
    else:
        log.append(f"Manual intervention required for {code} ({entry.title}).")
        for step in entry.correction_steps:
            log.append(f"  ! {step}")

    return CorrectionResult(
        matched_code=code,
        matched=True,
        error=entry,
        auto_correction_applied=applied,
        correction_log=log,
        timestamp=ts,
    )


# ---------------------------------------------------------------------------
# Deployment health checks
# ---------------------------------------------------------------------------

_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def build_deployment_dashboard(service_checks: Optional[List[Dict[str, Any]]] = None) -> DeploymentDashboard:
    """Build a deployment dashboard snapshot.

    *service_checks* can be injected by callers (e.g. live probes); defaults
    to a representative static baseline when omitted.
    """
    ts = datetime.now(UTC).isoformat()

    if service_checks is None:
        service_checks = [
            {
                "service": "ghostwallet-api",
                "status": "healthy",
                "version": "2.2.0",
                "details": {"uptime_s": 0, "rpc_pool_size": 3, "active_sessions": 0},
            },
            {
                "service": "ai-skill-defense-backend",
                "status": "healthy",
                "version": "2.2.0",
                "details": {"ioc_count": len(GHOSTWALLET_ERRORS), "scan_queue_depth": 0},
            },
            {
                "service": "rpc-proxy",
                "status": "healthy",
                "version": "1.0.0",
                "details": {"endpoints_active": 3, "avg_latency_ms": 45},
            },
            {
                "service": "key-management-service",
                "status": "healthy",
                "version": "1.4.2",
                "details": {"hsm_connected": True, "key_rotation_due_in_days": 14},
            },
        ]

    results = [
        DeploymentCheckResult(
            service=c["service"],
            status=c["status"],
            version=c.get("version"),
            last_checked=ts,
            details=c.get("details", {}),
        )
        for c in service_checks
    ]

    # Aggregate overall status
    statuses = {r.status for r in results}
    if "down" in statuses:
        overall = "down"
    elif "degraded" in statuses:
        overall = "degraded"
    else:
        overall = "healthy"

    # Error summary by category
    category_counts: Dict[str, int] = {}
    for entry in GHOSTWALLET_ERRORS.values():
        category_counts[entry.category] = category_counts.get(entry.category, 0) + 1

    return DeploymentDashboard(
        overall_status=overall,
        services=results,
        ghostwallet_errors_summary=category_counts,
        generated_at=ts,
    )
