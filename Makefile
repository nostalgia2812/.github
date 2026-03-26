## ============================================================
##  AI Skill Defense Console — Makefile
##  Usage:  make <target>
## ============================================================

REGISTRY   ?= ai-skill-defense
TAG        ?= latest
NAMESPACE  ?= default
DOMAIN     ?= your-domain.com

.PHONY: help setup env build push up down logs health \
        k8s-secrets k8s-apply k8s-rollout k8s-status k8s-delete \
        gen-app-key test clean

help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS=":.*##"}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- Local setup ----------------------------------------------------

setup:           ## First-time setup: copy .env.example and generate APP_API_KEY
	@if [ ! -f .env ]; then \
	  cp .env.example .env; \
	  APP_KEY=$$(python3 -c "import secrets; print(secrets.token_hex(32))"); \
	  sed -i "s/^APP_API_KEY=.*/APP_API_KEY=$$APP_KEY/" .env; \
	  echo "✓  .env created with a generated APP_API_KEY."; \
	  echo "   Fill in TWILIO_* and FB_* values to enable live mode."; \
	else \
	  echo ".env already exists — skipping."; \
	fi

gen-app-key:     ## Print a fresh random APP_API_KEY (paste into .env)
	@python3 -c "import secrets; print(secrets.token_hex(32))"

env:             ## Validate that .env exists and all required keys are present
	@python3 - <<'EOF'
import sys, os
from pathlib import Path
required = [
    "APP_API_KEY",
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER",
    "TWILIO_TWIML_APP_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET",
    "FB_APP_ID", "FB_APP_SECRET", "FB_PAGE_ACCESS_TOKEN",
]
env = {}
if Path(".env").exists():
    for line in Path(".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
missing = [k for k in required if not env.get(k)]
if missing:
    print("⚠  Missing / empty values in .env:")
    for k in missing: print(f"   - {k}")
    sys.exit(1)
print("✓  All required .env values present.")
EOF

# ---- Docker ---------------------------------------------------------

build:           ## Build both Docker images
	docker build --target production -t $(REGISTRY)/backend:$(TAG) ./backend
	docker build -t $(REGISTRY)/frontend:$(TAG) ./frontend

push:            ## Push images to registry (set REGISTRY=registry.example.com/org)
	docker push $(REGISTRY)/backend:$(TAG)
	docker push $(REGISTRY)/frontend:$(TAG)

up:              ## Start the stack with docker compose
	docker compose up -d --build

down:            ## Stop the stack
	docker compose down

logs:            ## Tail logs for all services
	docker compose logs -f

health:          ## Check backend health endpoint
	@curl -sf http://localhost:8000/api/health | python3 -m json.tool

# ---- Kubernetes -----------------------------------------------------

k8s-secrets:     ## Create/update K8s secret from local .env
	@echo "Applying secrets from .env to namespace $(NAMESPACE)..."
	@kubectl create secret generic ai-skill-defense-secrets \
	  --namespace=$(NAMESPACE) \
	  --from-env-file=.env \
	  --dry-run=client -o yaml | kubectl apply -f -
	@echo "✓  Secret ai-skill-defense-secrets updated."

k8s-apply:       ## Apply all K8s manifests (secrets first)
	$(MAKE) k8s-secrets
	kubectl apply -n $(NAMESPACE) -f deploy/k8s/backend.yaml
	kubectl apply -n $(NAMESPACE) -f deploy/k8s/frontend.yaml
	kubectl apply -n $(NAMESPACE) -f deploy/k8s/ingress.yaml

k8s-rollout:     ## Trigger a rolling restart of both deployments
	kubectl rollout restart deployment/ai-skill-defense-backend  -n $(NAMESPACE)
	kubectl rollout restart deployment/ai-skill-defense-frontend -n $(NAMESPACE)
	kubectl rollout status  deployment/ai-skill-defense-backend  -n $(NAMESPACE)
	kubectl rollout status  deployment/ai-skill-defense-frontend -n $(NAMESPACE)

k8s-status:      ## Show pods, services, and ingress
	@echo "\n=== Pods ==="; kubectl get pods    -n $(NAMESPACE) -l app=ai-skill-defense-backend
	@echo "";            kubectl get pods    -n $(NAMESPACE) -l app=ai-skill-defense-frontend
	@echo "\n=== Services ==="; kubectl get svc -n $(NAMESPACE) | grep ai-skill-defense
	@echo "\n=== Ingress ===";  kubectl get ing -n $(NAMESPACE) | grep ai-skill-defense

k8s-delete:      ## Tear down all K8s resources
	kubectl delete -n $(NAMESPACE) -f deploy/k8s/backend.yaml  --ignore-not-found
	kubectl delete -n $(NAMESPACE) -f deploy/k8s/frontend.yaml --ignore-not-found
	kubectl delete -n $(NAMESPACE) -f deploy/k8s/ingress.yaml  --ignore-not-found
	kubectl delete secret ai-skill-defense-secrets -n $(NAMESPACE) --ignore-not-found

# ---- Tests / CI -----------------------------------------------------

test:            ## Run backend tests
	docker run --rm -v $(PWD)/backend:/app -w /app \
	  python:3.12-slim sh -c "pip install -r requirements.txt -q && pytest tests/ -v"

clean:           ## Remove built images
	docker rmi $(REGISTRY)/backend:$(TAG) $(REGISTRY)/frontend:$(TAG) 2>/dev/null || true
