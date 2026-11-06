#!/usr/bin/env bash
# Nightly backup of BUY SUN leads, kept BACKUP_KEEP_DAYS days locally and,
# when BACKUP_REMOTE is set, off the server.
#
# Local: BACKUP_DIR/<date>/ holds the database dump and an uploads/ folder that
# looks like a full copy of the anketa files, but files that did not change
# since the night before are hard links to the previous copy. So every file is
# stored once, not once per night: 14 nights of copies take about the space of
# the files themselves, which matters on a 20 GB server.
#
# Off-site (BACKUP_REMOTE, an rclone "crypt" remote such as buysun-crypt:backups,
# because the copies hold personal data):
#   db/<date>/              the database dump of every night
#   uploads/                the anketa files as they are now; only new files are sent
#   uploads-removed/<date>/ files deleted or replaced that night, kept BACKUP_KEEP_DAYS days
set -euo pipefail
. "$(dirname "$0")/common.sh"

stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/$stamp"
umask 077
mkdir -p "$target" "$UPLOADS"
# Folders older than this (by their name, a date) are removed
cutoff="$(date -d "-${BACKUP_KEEP_DAYS} days" +%Y-%m-%d_%H%M%S)"

log "Backup $stamp started"
check_pg_versions "$DB_URL"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$target/db.dump"

previous="$(find "$BACKUP_DIR" -mindepth 2 -maxdepth 2 -type d -name uploads ! -path "$target/*" | sort | tail -1)"
rsync -a --delete ${previous:+--link-dest="$previous"} "$UPLOADS/" "$target/uploads/"

# What the restore checks against: counts in the database and every file with its size
psql "$DB_URL" -Atc "SELECT 'leads=' || count(*) FROM leads UNION ALL SELECT 'files=' || count(*) FROM lead_files" > "$target/counts.txt"
(cd "$target/uploads" && find . -type f -printf '%P %s\n' | LC_ALL=C sort) > "$target/uploads.list"
(cd "$target" && sha256sum db.dump counts.txt uploads.list > SHA256SUMS)
log "Local copy: $target ($(tr '\n' ' ' < "$target/counts.txt"), all copies take $(du -sh "$BACKUP_DIR" | cut -f1))"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy --exclude "uploads/**" "$target" "$BACKUP_REMOTE/db/$stamp"
  rclone sync "$UPLOADS" "$BACKUP_REMOTE/uploads" --backup-dir "$BACKUP_REMOTE/uploads-removed/$stamp"
  for dir in db uploads-removed; do
    # uploads-removed/ appears only after the first deleted file
    { rclone lsf --dirs-only "$BACKUP_REMOTE/$dir" 2>/dev/null || true; } | sed 's#/$##' | while read -r old; do
      if [[ "$old" < "$cutoff" ]]; then rclone purge "$BACKUP_REMOTE/$dir/$old"; fi
    done
  done
  log "Off-site copy: $BACKUP_REMOTE (db/$stamp, uploads)"
else
  log "WARNING: BACKUP_REMOTE is not set, the backup stays only on this server"
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
  if [[ "$(basename "$dir")" < "$cutoff" ]]; then rm -rf "$dir"; fi
done
log "Backup $stamp finished"
