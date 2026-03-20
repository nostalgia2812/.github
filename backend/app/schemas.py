from enum import Enum
from typing import List

from pydantic import BaseModel, Field, HttpUrl


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Indicator(BaseModel):
    type: str
    value: str
    source: str
    severity: Severity


class Finding(BaseModel):
    rule: str
    severity: Severity
    score_delta: int
    reason: str
    evidence: List[str] = Field(default_factory=list)


class ScanRequest(BaseModel):
    skill_name: str = Field(min_length=1)
    publisher: str = Field(min_length=1)
    instruction_text: str = Field(min_length=1)
    urls: List[HttpUrl] = Field(default_factory=list)


class ScanResponse(BaseModel):
    skill_name: str
    publisher: str
    risk_score: int
    risk_level: Severity
    findings: List[Finding]


class Checklist(BaseModel):
    immediate_24h: List[str]
    architecture_1_2_weeks: List[str]
    advanced_1_month: List[str]


class ErrorCorrectionRequest(BaseModel):
    raw_input: str = Field(min_length=1, description="Error code (e.g. 'GW-007') or partial error message.")


class DeploymentProbe(BaseModel):
    service: str
    status: str = Field(pattern="^(healthy|degraded|down)$")
    version: str | None = None
    details: dict = Field(default_factory=dict)
