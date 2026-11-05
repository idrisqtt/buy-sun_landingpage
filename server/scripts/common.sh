# Shared settings for backup scripts. Reads server/.env unless ENV_FILE points elsewhere.
SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$SERVER_DIR/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${UPLOAD_DIR:?UPLOAD_DIR is not set}"

# libpq does not understand Prisma's "?schema=public"
DB_URL="${DATABASE_URL%%\?*}"
# UPLOAD_DIR may be relative to the server folder, like the app reads it
case "$UPLOAD_DIR" in
  /*) UPLOADS="$UPLOAD_DIR" ;;
  *) UPLOADS="$SERVER_DIR/${UPLOAD_DIR#./}" ;;
esac
BACKUP_DIR="${BACKUP_DIR:-/var/backups/buysun}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# A dump made by a newer pg_dump cannot be restored into an older server, so
# the client tools must have the same major version as the database server.
check_pg_versions() {
  local server client
  server="$(psql "$1" -Atc "SHOW server_version_num" | cut -c1-2)"
  client="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
  if [ "$server" != "$client" ]; then
    echo "pg_dump $client does not match the database server $server: install postgresql-client-$server" >&2
    exit 1
  fi
}
