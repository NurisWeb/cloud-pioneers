#!/usr/bin/env bash
# Deployt die Cloud Pioneers Website (Astro SSR) als Container nach Azure Container Apps.
#
# Voraussetzungen: Azure CLI, eingeloggt (az login). Docker lokal ist NICHT nötig,
# das Image wird mit `az acr build` direkt in Azure gebaut.
#
# Aufruf (im Projektordner, z. B. in Git Bash):  ./deploy.sh
#
# Beim ersten Lauf werden Resource Group, Registry, Container-Apps-Umgebung und App angelegt.
# Danach wird nur noch ein neues Image gebaut und die App darauf aktualisiert.
set -euo pipefail

# ---- Konfiguration ----------------------------------------------------------
SUBSCRIPTION_ID="4f165e7a-a7a6-44a6-ab4d-6a0261bf8345"
LOCATION="westeurope"
RESOURCE_GROUP="rg-cloudpioneers"
ACR_NAME="acrcloudpioneers"          # global eindeutig, nur a-z und 0-9
ENVIRONMENT="cae-cloudpioneers"
APP_NAME="ca-cloudpioneers"
IMAGE_NAME="cloudpioneers-web"
PORT=4321
MIN_REPLICAS=1                        # 0 = günstiger, aber Kaltstart von einigen Sekunden
MAX_REPLICAS=3
# -----------------------------------------------------------------------------

# Schutz: Dieses Skript darf niemals Ressourcen anderer Projekte anfassen.
for name in "$RESOURCE_GROUP" "$ACR_NAME" "$ENVIRONMENT" "$APP_NAME" "$IMAGE_NAME"; do
  if [[ "${name,,}" == *carparts* ]]; then
    echo "ABBRUCH: '$name' enthält 'carparts'. Dieses Skript ist nur für Cloud Pioneers." >&2
    exit 1
  fi
done

# Git Bash unter Windows: keine Pfad-Umschreibung von Azure-Argumenten
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")"

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo manual)-$(date +%Y%m%d%H%M%S)"
IMAGE="$ACR_NAME.azurecr.io/$IMAGE_NAME:$TAG"

echo "==> Subscription setzen"
az account set --subscription "$SUBSCRIPTION_ID"
echo "    $(az account show --query name -o tsv)"

echo "==> Azure-CLI-Erweiterung und Provider"
az extension add --name containerapp --upgrade --only-show-errors -y
for p in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry; do
  az provider register --namespace "$p" --only-show-errors >/dev/null
done

echo "==> Resource Group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --only-show-errors -o none

echo "==> Container Registry: $ACR_NAME"
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az acr create --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" --sku Basic --admin-enabled false --only-show-errors -o none
fi

echo "==> Image bauen in Azure: $IMAGE"
az acr build --registry "$ACR_NAME" --image "$IMAGE_NAME:$TAG" --image "$IMAGE_NAME:latest" .

echo "==> Container-Apps-Umgebung: $ENVIRONMENT"
if ! az containerapp env show --name "$ENVIRONMENT" --resource-group "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az containerapp env create --name "$ENVIRONMENT" --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" --only-show-errors -o none
fi

echo "==> Container App: $APP_NAME"
if ! az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az containerapp create --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
    --environment "$ENVIRONMENT" \
    --image "$IMAGE" \
    --registry-server "$ACR_NAME.azurecr.io" --registry-identity system \
    --ingress external --target-port "$PORT" \
    --cpu 0.5 --memory 1.0Gi \
    --min-replicas "$MIN_REPLICAS" --max-replicas "$MAX_REPLICAS" \
    --env-vars HOST=0.0.0.0 PORT="$PORT" \
    --only-show-errors -o none
else
  az containerapp update --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
    --image "$IMAGE" --only-show-errors -o none
fi

FQDN="$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)"

echo
echo "Fertig. Version $TAG läuft unter:"
echo "  https://$FQDN"
