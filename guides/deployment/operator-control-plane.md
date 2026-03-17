# Operator Control Plane Deployment Guide

This guide describes the deployment contract and operational interfaces for the operator control plane.

## API contract

The full API contract is defined in OpenAPI format:

- [Operator Control Plane OpenAPI Specification](../../api/openapi/operator-control-plane.yaml)

## Deployment requirements

- Expose the API service over HTTPS.
- Enforce JWT bearer authentication for all endpoints.
- Ensure role claims map to one of: `operator`, `reviewer`, `admin`.
- Configure immutable audit event storage (append-only semantics).
- Propagate `correlation_id` through all command and event workflows.

## Operational domains

- **Approvals**: pending approvals queue, decisioning, and justifications.
- **Incidents**: skill quarantine, credential revocation, publisher disablement, and timeline replay.
- **Audit**: immutable event read API for compliance and forensics.
- **Access control**: role model introspection endpoint.
