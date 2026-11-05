#!/usr/bin/env bash
# Nightly backup of BUY SUN leads: database dump + anketa files, kept locally
# for BACKUP_KEEP_DAYS days and copied off the server when BACKUP_REMOTE is set.
#
# BACKUP_REMOTE is an rclone remote, e.g. "buysun-crypt:backups". Use an rclone
# "crypt" remote: the copies hold personal data and must be encrypted off-site.
#
# Cron (as the server user): 30 3 * * * /opt/buysun/server/scripts/backup.sh >> /var/log/buysun-backup.log 2>&1
set -euo pipefail
. "$(dirname "$0")/common.sh"

stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/$stamp"
umask 077
mkdir -p "$target"

log "Backup $stamp started"
check_pg_versions "$DB_URL"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$target/db.dump"
mkdir -p "$UPLOADS"
tar -C "$UPLOADS" -czf "$target/uploads.tar.gz" .

# What the restore test compares against
psql "$DB_URL" -Atc "SELECT 'leads=' || count(*) FROM leads UNION ALL SELECT 'files=' || count(*) FROM lead_files" > "$target/counts.txt"
(cd "$target" && sha256sum db.dump uploads.tar.gz counts.txt > SHA256SUMS)
log "Local copy: $target ($(du -sh "$target" | cut -f1), $(tr '\n' ' ' < "$target/counts.txt"))"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$target" "$BACKUP_REMOTE/$stamp"
  rclone delete --min-age "${BACKUP_KEEP_DAYS}d" "$BACKUP_REMOTE"
  rclone rmdirs --leave-root "$BACKUP_REMOTE"
  log "Off-site copy: $BACKUP_REMOTE/$stamp"
else
  log "WARNING: BACKUP_REMOTE is not set, the backup stays only on this server"
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_KEEP_DAYS" -exec rm -rf {} +
log "Backup $stamp finished"
