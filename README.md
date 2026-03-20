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


### Defensive provider catalog

- Endpoint: `GET /api/providers`
- Returns supported threat-intelligence providers for defensive monitoring together with an explicit blocked-use policy for offensive misuse.


### Safety policy

- Endpoint: `GET /api/safety/policy`
- Returns the blocked offensive capability list and approved defensive alternatives implemented by this service.


### Dashboard context

- Endpoint: `GET /api/dashboard/context`
- Returns recent content and integrated workflow tools that the frontend uses to make analyst decisions and reporting more efficient.


### Developer toolkit context

- Endpoint: `GET /api/developer-toolkit`
- Returns safe ADK, Gemini CLI, KitOps, and PowerShell workflow guidance used by the dashboard to improve developer productivity.


### API auditing

- Endpoint: `POST /api/audit`
- Utility script: `node scripts/audit.js <url>`
- Audits endpoint status code and latency, and reminds the operator when a sensitive endpoint is tested over `http://` instead of `https://`.
