#!/usr/bin/env bash
# Managers of the cabinet on the server, run as the buysun user:
#   sudo -u buysun /opt/buysun/current/deploy/manager.sh add anna@buysun.kz "Анна Ли"
# See server/scripts/manager.js for all commands.
set -euo pipefail
set -a
. /opt/buysun/shared/server.env
set +a
cd /opt/buysun/current/server
exec node scripts/manager.js "$@"
