#!/usr/bin/env bash
# Restores a backup made by backup.sh.
#   restore.sh <backup folder>                     into DATABASE_URL / UPLOAD_DIR from .env
#   RESTORE_DB_URL=... RESTORE_UPLOADS=... restore.sh <folder>   somewhere else
# Overwriting the live data asks for confirmation unless --yes is given.
set -euo pipefail
. "$(dirname "$0")/common.sh"

src="${1:?Usage: restore.sh <backup folder> [--yes]}"
target_db="${RESTORE_DB_URL:-$DB_URL}"
target_uploads="${RESTORE_UPLOADS:-$UPLOADS}"

check_pg_versions "$target_db"
(cd "$src" && sha256sum --check --quiet SHA256SUMS) || { echo "Backup files are damaged (checksum mismatch)" >&2; exit 1; }
# Every anketa file listed at backup time is there with the same size
(cd "$src/uploads" && find . -type f -printf '%P %s\n' | LC_ALL=C sort) | LC_ALL=C comm -23 "$src/uploads.list" - | head -5 | grep . >&2 \
  && { echo "Backup is missing the anketa files above" >&2; exit 1; }

if [ "$target_db" = "$DB_URL" ] && [ "${2:-}" != "--yes" ]; then
  read -r -p "This replaces the LIVE leads database and files. Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || { echo "Cancelled"; exit 1; }
fi

log "Restoring database from $src"
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname="$target_db" "$src/db.dump"

log "Restoring files into $target_uploads"
mkdir -p "$target_uploads"
find "$target_uploads" -mindepth 1 -delete
cp -a "$src/uploads/." "$target_uploads/"
log "Restore finished"
