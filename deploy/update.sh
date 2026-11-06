#!/usr/bin/env bash
# Deploys the latest commit of the branch from GitHub, if it is new.
# Runs every 5 minutes from buysun-update.timer as the "buysun" user;
# "update.sh --force" redeploys the current commit.
#
# Every version gets its own folder in releases/: the code, the server
# packages and the built site. It is prepared next to the running version and
# switched on in one step only when everything is ready, so a failed update
# (out of memory, no network, a broken build) never touches what is running.
# Packages are installed only when package-lock.json changes; otherwise they
# come from the cache as hard links (instant, no extra disk space). If the new
# API does not start, the previous version is switched back. 5 are kept.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/buysun}"
REPO="$APP_DIR/repo"
BRANCH="${DEPLOY_BRANCH:-main}"
RELEASES="$APP_DIR/releases"
CACHE="$APP_DIR/cache"
export NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

exec 9>"$APP_DIR/.update.lock"
if [ "${1:-}" = "--force" ]; then
  flock -w 1200 9 || { log "Could not wait for the running update"; exit 1; }
else
  flock -n 9 || { log "Another update is running"; exit 0; }
fi

cd "$REPO"
git fetch --quiet origin "$BRANCH"
target="$(git rev-parse "origin/$BRANCH")"
current="$(cat "$APP_DIR/current/COMMIT" 2>/dev/null || echo none)"
if [ "$target" = "$current" ] && [ "${1:-}" != "--force" ]; then
  exit 0
fi
# A version whose API did not start is not tried again every 5 minutes (each
# try stops the forms for half a minute): it waits for a new commit or --force
if [ "$target" = "$(cat "$APP_DIR/.failed-commit" 2>/dev/null)" ] && [ "${1:-}" != "--force" ]; then
  log "Not deploying ${target:0:7} again: its API did not start. Push a fix to GitHub or run update.sh --force"
  exit 1
fi

log "Deploying ${target:0:7} (was ${current:0:7})"
mkdir -p "$RELEASES" "$CACHE"
release="$RELEASES/${target:0:12}-$(date '+%Y%m%d%H%M%S')"
build="$release.building"
rm -rf "$RELEASES"/*.building
trap 'rm -rf "$build"' EXIT # anything unfinished is thrown away
mkdir "$build"
git archive "$target" | tar -x -C "$build"
echo "$target" > "$build/COMMIT"

# Packages of one package-lock.json, installed once into the cache. An install
# cut short (power, memory) has no .complete mark and is done again.
# $1: folder with package.json and package-lock.json, $2: cache name, then npm ci options
link_packages() {
  local src="$1" name="$2" key dir
  shift 2
  key="$(cat "$src/package-lock.json" - <<<"$*" | sha256sum | cut -c1-16)"
  dir="$CACHE/$name-$key"
  if [ ! -f "$dir/.complete" ]; then
    log "Installing $name packages (package-lock.json changed)"
    rm -rf "$dir"
    mkdir -p "$dir"
    cp "$src/package.json" "$src/package-lock.json" "$dir/"
    (cd "$dir" && npm ci "$@" --no-audit --no-fund --loglevel=error)
    touch "$dir/.complete"
  fi
  touch "$dir" # recently used: kept by the clean-up below
  cp -al "$dir/node_modules" "$src/node_modules"
}

# Server: packages, database client (generated fresh, never into the shared
# hard-linked files) and migrations
link_packages "$build/server" server --omit=dev
cd "$build/server"
rm -rf node_modules/.prisma
./node_modules/.bin/prisma generate >/dev/null
./node_modules/.bin/prisma migrate deploy

# Site: build tools are dev dependencies; they always come from the lockfile,
# never downloaded on the fly by npx
link_packages "$build" site --include=dev
cd "$build"
./node_modules/.bin/vite build --logLevel error --outDir "$build/site" --emptyOutDir
# A version keeps only what runs: the server, the built site and these scripts
find "$build" -mindepth 1 -maxdepth 1 ! -name server ! -name site ! -name deploy ! -name COMMIT -exec rm -rf {} +

# Switch in one step
mv -T "$build" "$release"
trap - EXIT
previous="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
switch_to() {
  ln -sfn "$1" "$APP_DIR/current.new"
  mv -T "$APP_DIR/current.new" "$APP_DIR/current"
  sudo /usr/bin/systemctl restart buysun-api.service
}
api_up() {
  for _ in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:${PORT:-3001}/api/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

switch_to "$release"
if ! api_up; then
  if [ -n "$previous" ] && [ -d "$previous" ]; then
    log "ERROR: the API did not start on ${target:0:7}; switching back to $(basename "$previous")"
    echo "$target" > "$APP_DIR/.failed-commit"
    switch_to "$previous"
    api_up && log "Back on the previous version" || log "ERROR: the previous version did not start either"
  else
    log "ERROR: the API did not start on ${target:0:7}"
  fi
  exit 1
fi
log "Deployed ${target:0:7}"
rm -f "$APP_DIR/.failed-commit"

# Keep the 5 newest releases (never the running one) and caches used in 30 days
running="$(readlink -f "$APP_DIR/current")"
ls -1dt "$RELEASES"/*/ 2>/dev/null | sed 's#/$##' | { grep -vxF "$running" || true; } | tail -n +5 | xargs -r rm -rf
find "$CACHE" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
