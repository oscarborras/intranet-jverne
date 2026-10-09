#!/usr/bin/env bash
# Deploys the latest commit of origin/main: pull, install, build and reload PM2.
# Usage: scripts/deploy.sh          (does nothing if there are no new commits)
#        scripts/deploy.sh --force  (rebuilds even without new commits)
# See doc/Install_produccion_frontend.md
set -euo pipefail

APP_NAME="intranet"
BRANCH="main"

# Everything runs inside main() so bash has read the whole script before
# "git merge" replaces this file with a newer version.
main() {
  cd "$(dirname "$(readlink -f "$0")")/.."

  # Avoid two deployments running at the same time
  exec 9>/tmp/deploy-intranet.lock
  flock -n 9 || { echo "Ya hay un despliegue en curso."; exit 1; }

  # 1. A local package-lock.json is always discarded (the repo one is the valid one).
  #    Any other local change to tracked files stops the deployment.
  git checkout -- package-lock.json 2>/dev/null || true
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "ERROR: hay cambios locales en ficheros del repositorio:"
    git status --short --untracked-files=no
    exit 1
  fi

  # 2. Fetch and check whether there is anything new
  git fetch --quiet origin "$BRANCH"
  local old new
  old=$(git rev-parse HEAD)
  new=$(git rev-parse "origin/$BRANCH")
  if [[ "$old" == "$new" && "${1:-}" != "--force" ]]; then
    log "Sin cambios ($(git log -1 --format='%h %s'))."
    exit 0
  fi

  log "Actualizando ${old:0:7} -> ${new:0:7}"
  git merge --ff-only --quiet "origin/$BRANCH"

  # 3. Dependencies: only when package-lock.json changed (npm ci wipes node_modules,
  #    which the running app still uses) or node_modules is missing
  if [[ ! -d node_modules ]] || ! git diff --quiet "$old" "$new" -- package-lock.json; then
    log "Instalando dependencias (npm ci)..."
    npm ci --include=dev
  else
    log "Dependencias sin cambios, se omite npm ci."
  fi

  # 4. Build. If it fails the script stops and the running version keeps serving
  log "Compilando..."
  npm run build

  # 5. Zero-downtime reload keeping the Madrid time zone
  log "Recargando PM2..."
  TZ=Europe/Madrid pm2 reload "$APP_NAME" --update-env
  pm2 save >/dev/null

  log "Desplegado: $(git log -1 --format='%h %s')"
}

log() { echo "[$(date '+%F %T')] $*"; }

main "$@"
