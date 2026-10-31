#!/usr/bin/env bash
# Development only: updates packages to the newest release within their current
# major version (e.g. next 16.4.2 -> 16.5.1, never 17.x), checks the build and
# leaves package.json + package-lock.json ready to commit.
# Usage: scripts/update-deps.sh [--check] [-y] [package...]
#   --check   only lists available updates, changes nothing
#   -y        does not ask for confirmation
#   package   packages to update (default: next react react-dom)
# Never run it on the production server: there only "npm ci" is used (scripts/deploy.sh).
set -euo pipefail

DEFAULT_PACKAGES=(next react react-dom)

main() {
  cd "$(dirname "$(readlink -f "$0")")/.."

  local check_only=0 assume_yes=0 packages=()
  for arg in "$@"; do
    case "$arg" in
      --check) check_only=1 ;;
      -y) assume_yes=1 ;;
      -*) echo "Opción desconocida: $arg"; exit 1 ;;
      *) packages+=("$arg") ;;
    esac
  done
  (( ${#packages[@]} )) || packages=("${DEFAULT_PACKAGES[@]}")

  # 1. Work out the newest version inside the current major of each package
  local pkg current major target installs=()
  for pkg in "${packages[@]}"; do
    current=$(declared_version "$pkg")
    if [[ -z "$current" ]]; then
      log "  $pkg: no está en package.json, se omite"
      continue
    fi
    major=${current%%.*}
    target=$(latest_in_major "$pkg" "$major")
    if [[ -z "$target" ]]; then
      log "  $pkg: no se pudo consultar npm"
    elif [[ "$target" == "$current" ]]; then
      log "  $pkg: $current (al día en la versión $major.x)"
    else
      log "  $pkg: $current -> $target"
      installs+=("$pkg@$target")
    fi
  done

  if (( ! ${#installs[@]} )); then
    log "No hay actualizaciones dentro de la misma versión mayor."
    exit 0
  fi
  (( check_only )) && exit 0

  # 2. Start from a clean package.json / package-lock.json so a failure can be undone
  if ! git diff --quiet -- package.json package-lock.json; then
    log "ERROR: package.json o package-lock.json tienen cambios sin commit."
    exit 1
  fi

  if (( ! assume_yes )); then
    read -r -p "¿Instalar ${installs[*]}? [s/N] " answer
    [[ "$answer" =~ ^[sSyY]$ ]] || { log "Cancelado."; exit 0; }
  fi

  # 3. Install keeping exact versions (no ^) like the rest of package.json
  log "Instalando ${installs[*]}..."
  npm install --save-exact "${installs[@]}"

  # 4. Verify the build; on failure restore the previous dependencies
  log "Compilando para verificar..."
  if ! npm run build; then
    log "ERROR: la compilación ha fallado. Restaurando las versiones anteriores..."
    git checkout -- package.json package-lock.json
    npm ci
    exit 1
  fi

  log "Actualización correcta. Prueba la app con 'npm run dev' y después:"
  log "  git add package.json package-lock.json"
  log "  git commit -m \"chore(deps): update ${installs[*]}\""
  log "  git push origin main   (y en el servidor: scripts/deploy.sh)"
}

# Version declared in package.json, without range prefixes such as ^ or ~
declared_version() {
  node -e '
    const p = require("./package.json");
    const v = (p.dependencies || {})[process.argv[1]] || (p.devDependencies || {})[process.argv[1]] || "";
    process.stdout.write(v.replace(/^[^0-9]*/, ""));
  ' "$1"
}

# Highest stable version published for a major. npm returns the matching
# versions in publish order (backports break it), so they are sorted here.
latest_in_major() {
  npm view "$1@^$2" version --json 2>/dev/null | node -e '
    let s = "";
    process.stdin.on("data", (c) => (s += c)).on("end", () => {
      if (!s.trim()) return;
      const list = [].concat(JSON.parse(s));
      const num = (v) => v.split(".").map(Number);
      list.sort((a, b) => {
        const [x, y] = [num(a), num(b)];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
      });
      process.stdout.write(list[list.length - 1]);
    });
  ' || true
}

log() { echo "[$(date '+%F %T')] $*"; }

main "$@"
