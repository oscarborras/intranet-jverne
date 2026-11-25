#!/usr/bin/env bash
# Deploys the latest commit of origin/main: pull, install, build and reload PM2.
# Usage: scripts/deploy.sh          (does nothing if the latest commit is already deployed)
#        scripts/deploy.sh --force  (rebuilds even if it is already deployed)
# The last fully deployed commit is stored in .git/deployed-commit (written only after
# PM2 reloads), so an interrupted run is completed by the next one without --force.
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
  DEPLOYED_FILE="$(git rev-parse --git-dir)/deployed-commit"

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

  # 2. Fetch and compare with the last fully deployed commit (not with HEAD: an
  #    interrupted run may have merged the code without building or reloading)
  git fetch --quiet origin "$BRANCH"
  local head new deployed base
  head=$(git rev-parse HEAD)
  new=$(git rev-parse "origin/$BRANCH")
  deployed=$(cat "$DEPLOYED_FILE" 2>/dev/null || true)
  if [[ "$deployed" == "$new" && "${1:-}" != "--force" ]]; then
    log "Sin cambios ($(git log -1 --format='%h %s'))."
    check_updates
    check_vulnerabilities
    exit 0
  fi

  if [[ "$head" != "$new" ]]; then
    log "Actualizando ${head:0:7} -> ${new:0:7}"
    git merge --ff-only --quiet "origin/$BRANCH"
  elif [[ -n "$deployed" && "$deployed" != "$new" ]]; then
    log "El despliegue anterior no terminó (desplegado: ${deployed:0:7}). Se completa ahora."
  fi

  # Base to detect dependency changes: the last deployed commit if it is known,
  # otherwise the commit the server had before this run
  if [[ -n "$deployed" ]] && git cat-file -e "${deployed}^{commit}" 2>/dev/null; then
    base="$deployed"
  else
    base="$head"
  fi

  # 3. Dependencies: only when package-lock.json changed (npm ci wipes node_modules,
  #    which the running app still uses) or node_modules is missing
  if [[ ! -d node_modules ]] || ! git diff --quiet "$base" "$new" -- package-lock.json; then
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
  echo "$new" > "$DEPLOYED_FILE"

  log "Desplegado: $(git log -1 --format='%h %s')"
  check_updates
  check_vulnerabilities
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

# Informational only: counts the known vulnerabilities (npm audit) of the installed
# dependencies, both overall and in the ones the running app uses (no devDependencies).
# Fixes must be done in development too. A network failure only skips the check.
check_vulnerabilities() {
  local all prod
  log "Comprobando vulnerabilidades (npm audit)..."
  all=$(audit_summary)
  prod=$(audit_summary --omit=dev)
  if [[ -z "$all" ]]; then
    log "  No se pudo comprobar (¿sin conexión con npm?)."
    return 0
  fi
  log "  Total: $all"
  log "  En producción (sin devDependencies): ${prod:-no se pudo comprobar}"
  if [[ "$all" != "0" ]]; then
    log "Revísalas en desarrollo (nunca en este servidor):"
    log "  npm audit             muestra el detalle de cada una"
    log "  npm audit fix         corrige las que no cambian de versión mayor"
    log "Después haz commit y push de package.json y package-lock.json y vuelve a desplegar."
  fi
}

# Prints "0" or "N (x críticas, y altas, ...)"; nothing if npm audit could not run.
# npm audit exits with 1 when it finds vulnerabilities, hence the "|| true".
audit_summary() {
  { npm audit --json "$@" 2>/dev/null || true; } | node -e '
    let s = "";
    process.stdin.on("data", (c) => (s += c)).on("end", () => {
      let v;
      try { v = JSON.parse(s).metadata.vulnerabilities; } catch { return; }
      if (!v) return;
      const names = [["critical", "crítica"], ["high", "alta"], ["moderate", "moderada"], ["low", "baja"], ["info", "informativa"]];
      const parts = names.filter(([k]) => v[k] > 0).map(([k, n]) => `${v[k]} ${n}${v[k] > 1 ? "s" : ""}`);
      process.stdout.write(v.total ? `${v.total} (${parts.join(", ")})` : "0");
    });
  ' || true
}

log() { echo "[$(date '+%F %T')] $*"; }

main "$@"
