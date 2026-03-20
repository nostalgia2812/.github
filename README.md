# .github

*Community health files for the [@GitHub](https://github.com/github) organization*

For more information, please see the article on [creating a default community health file for your organization](https://help.github.com/en/articles/creating-a-default-community-health-file-for-your-organization).

## AI Skill Defense deployment

This repository now includes a deployable reference implementation for a frontend + backend stack that models OpenClaw-style AI skill analysis, including a visual risk dashboard.

### Local run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
cd frontend
python -m http.server 8080
```

### Container deployment

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API via frontend proxy: `http://localhost:8080/api/health`

### Kubernetes deployment

```bash
kubectl apply -f deploy/k8s/backend.yaml
kubectl apply -f deploy/k8s/frontend.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```


### Threat model raw export

- Endpoint: `GET /api/threat-model/raw`
- Returns the complete production-ready OpenClaw threat model code string from the backend module.


### API key + Fluid integration

Set optional environment variables for secured and integrated operation:

- `APP_API_KEY`: if set, protected endpoints require `X-API-Key` header.
- `FLUID_API_KEY`: API key used for Fluid integration payload generation.
- `FLUID_BASE_URL`: optional override (default: `https://api.fluid.security/v1`).

New endpoints:

- `GET /api/integrations/fluid/status`
- `POST /api/integrations/fluid/payload`


### API catalog

- Endpoint: `GET /api`
- Returns the complete list of all exposed endpoints with HTTP method, description, and whether API key protection applies.

## Dashboard modes

The frontend now exposes two views side by side:

- **Defense Console**: the original skill-analysis workflow with scan form, risk meter, findings, rule impact, and IOC list
- **APOPO System Overview**: a frontend summary of the supplied APOPO architecture, deployment flow, docs map, and benchmark claims, with explicit notes that benchmark numbers are illustrative unless validated in-repo

### View the frontend locally

```bash
cd frontend
python -m http.server 8080
```

Then open `http://localhost:8080` and switch between the two tabs.

