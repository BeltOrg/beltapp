#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_URL="${1:-${SERVICE_URL:-}}"

if [[ -z "${SERVICE_URL}" ]]; then
  echo "Usage: validate-post-deploy-smoke.sh <service-url>" >&2
  echo "Or set SERVICE_URL in the environment." >&2
  exit 1
fi

SERVICE_URL="${SERVICE_URL%/}"
HEALTH_URL="${SERVICE_URL}/health"
GRAPHQL_URL="${SERVICE_URL}/graphql"

echo "Running deployed backend Belt smoke tests"
echo "  service URL: ${SERVICE_URL}"

export SERVICE_URL HEALTH_URL GRAPHQL_URL
node "${SCRIPT_DIR}/post-deploy-belt-smoke.mjs"
