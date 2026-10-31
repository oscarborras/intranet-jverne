#!/usr/bin/env bash
# Deploys the latest commit of origin/main: pull, install, build and reload PM2.
# Usage: scripts/deploy.sh          (does nothing if there are no new commits)
#        scripts/deploy.sh --force  (rebuilds even without new commits)
# See doc/Install_produccion_frontend.md
set -euo pipefail

APP_NAME="intranet"
BRANCH="main"
# Packages whose newer npm releases are reported (never installed here)
WATCHED_PACKAGES=(next react react-dom)

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
    check_updates
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
  check_updates
}

# Informational only: compares the installed version of each watched package with
# the latest one on npm. Upgrades must be done in development (commit the new
# package-lock.json); never run "npm install" on the server. A network failure
# only skips the check, it never stops the deployment.
check_updates() {
  local pkg current latest pending=0
  log "Comprobando actualizaciones de ${WATCHED_PACKAGES[*]}..."
  for pkg in "${WATCHED_PACKAGES[@]}"; do
    current=$(node -p "require('$pkg/package.json').version" 2>/dev/null || echo "")
    latest=$(npm view "$pkg" version 2>/dev/null || echo "")
    if [[ -z "$current" || -z "$latest" ]]; then
      log "  $pkg: no se pudo comprobar (instalada: ${current:-?}, última: ${latest:-?})"
    elif [[ "$current" != "$latest" ]]; then
      log "  $pkg: $current -> $latest disponible"
      pending=1
    else
      log "  $pkg: $current (al día)"
    fi
  done
  if (( pending )); then
    log "Hay actualizaciones. Aplícalas en desarrollo (nunca en este servidor):"
    log "  npm run deps:check    lista las disponibles dentro de la misma versión mayor"
    log "  npm run deps:update   las instala y compila para verificar"
    log "Después haz commit y push de package.json y package-lock.json y vuelve a desplegar."
    log "Un cambio de versión mayor no lo aplica deps:update: revisa antes la guía de migración."
  fi
}

log() { echo "[$(date '+%F %T')] $*"; }

main "$@"
