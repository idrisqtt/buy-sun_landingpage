#!/usr/bin/env bash
# Deploys the latest commit of the branch from GitHub, if it is new.
# Runs every 5 minutes from buysun-update.timer as the "buysun" user;
# "update.sh --force" redeploys the current commit.
#
# The new site is built into its own folder and switched on in one step, so
# visitors never see a half-built site; the last 5 releases are kept.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/buysun}"
REPO="$APP_DIR/repo"
BRANCH="${DEPLOY_BRANCH:-main}"
RELEASES="$APP_DIR/releases"
export NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false

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
current="$(basename "$(readlink -f "$APP_DIR/current" 2>/dev/null || echo none)")"
if [ "$target" = "$current" ] && [ "${1:-}" != "--force" ]; then
  exit 0
fi

log "Deploying ${target:0:7} (was ${current:0:7})"
git reset --hard --quiet "$target"

# Server: dependencies, database client and migrations
cd "$REPO/server"
npm ci --omit=dev --no-audit --no-fund --loglevel=error
./node_modules/.bin/prisma generate >/dev/null
./node_modules/.bin/prisma migrate deploy

# Site: build into a new release folder. Build tools are dev dependencies,
# and NODE_ENV=production would skip them; tools always come from the
# lockfile in node_modules, never downloaded on the fly by npx
cd "$REPO"
npm ci --include=dev --no-audit --no-fund --loglevel=error
rm -rf "$RELEASES/$target"
./node_modules/.bin/vite build --logLevel error --outDir "$RELEASES/$target" --emptyOutDir

# Switch the site and restart the API
ln -sfn "$RELEASES/$target" "$APP_DIR/current.new"
mv -T "$APP_DIR/current.new" "$APP_DIR/current"
sudo /usr/bin/systemctl restart buysun-api.service

for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORT:-3001}/api/health" >/dev/null 2>&1; then
    log "Deployed ${target:0:7}"
    # Keep the 5 newest releases
    ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done
log "ERROR: the API did not start after deploying ${target:0:7}"
exit 1
