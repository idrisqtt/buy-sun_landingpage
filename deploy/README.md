# buysun.kz on a PS.kz VPS

One small server (PS.kz Basic-1: 1 CPU, 1 GB memory, 20 GB disk, Ubuntu 24.04)
runs everything:

| Part | What it does |
|---|---|
| Caddy | Serves the site over HTTPS, gets and renews the certificate itself, forwards `/api` to the API |
| `buysun-api` | The forms and anketa server (`server/`), only reachable from the machine itself |
| PostgreSQL | Leads and anketas, local socket only, no password |
| `buysun-update.timer` | Every 5 minutes: if `main` on GitHub has a new commit, builds and switches to it |
| `buysun-backup.timer` | Every night 03:30: database + anketa files, 14 days kept, copied off the server |
| `buysun-restore-test.timer` | 1st of every month: restores the latest backup into a temporary database and checks it |
| `buysun-healthcheck.timer` | Every 5 minutes: site, API, certificate, disk, backups, failed jobs, failed deliveries; emails the client |
| unattended-upgrades | Security updates every day, reboot at 04:30 when the kernel needs it |

Measured on a test machine: about 200 MB of memory in use, everything comes
back by itself after a reboot.

## What is needed before the move

1. **The server**: Basic-1 on PS.kz with Ubuntu 24.04, ordered in the client’s name, root SSH access.
2. **GitHub access**: the setup script prints a key; the owner of
   `idrisqtt/buy-sun_landingpage` adds it in Settings → Deploy keys (read-only).
3. **Work email** for lead copies and problem alerts, and an SMTP mailbox to send from.
4. **Bitrix24** incoming webhook with the CRM scope (see `server/README.md`).
5. **Off-site backup storage**: any place rclone supports (PS.kz object storage,
   Google Drive, Yandex Disk), set up as an rclone *crypt* remote.

## Setup

```bash
ssh root@<server>
git clone https://github.com/idrisqtt/buy-sun_landingpage.git /tmp/buysun   # or copy deploy/setup-server.sh
DOMAIN=buysun.kz bash /tmp/buysun/deploy/setup-server.sh
```

The script can be run again at any time; it only does what is missing. It
stops once to show the GitHub key, then continues on the next run.

Then:

1. Fill in Bitrix24, SMTP and emails in `/opt/buysun/shared/server.env`,
   `systemctl restart buysun-api`.
2. Check the new server before switching the domain:
   `curl -k --resolve buysun.kz:443:<server ip> https://buysun.kz/api/health`.
3. In the PS.kz DNS panel point `buysun.kz` and `www.buysun.kz` (A records) to
   the server. Caddy gets the certificate within a minute after DNS updates.
   The old Vercel site keeps working until then, so there is no downtime.
4. Off-site backups: `sudo -u buysun rclone config` (a crypt remote over the
   storage), set `BACKUP_REMOTE=<remote>:backups` in `server.env`. After the
   first night: `sudo -u buysun /opt/buysun/current/server/scripts/restore-test.sh --remote`.
5. **Outside uptime monitor.** The health check runs on the server and cannot
   report the server itself being off. Create a free monitor at
   uptimerobot.com (HTTP(s), `https://buysun.kz/api/health`, every 5 minutes)
   with alerts to the client’s work email.

## Managers and the cabinet

The cabinet is at `https://buysun.kz/admin/`; every anketa in Bitrix24 has a
link “Открыть и исправить анкету в кабинете”.

The setup script creates the first manager, `buysun@gmail.com` (another one:
`ADMIN_EMAIL=… ADMIN_NAME=…` before `setup-server.sh`). Its temporary password
is made on the server, never stored in the repository (it is public), shown at
the end of the setup and kept in `/opt/buysun/shared/first-manager.txt`; delete
that file after the first login. Add more managers on the server:

```bash
sudo -u buysun /opt/buysun/current/deploy/manager.sh add anna@buysun.kz "Анна Ли"
```

It prints a temporary password; send it to the manager privately. On the
first login the cabinet asks for a new password and to connect Google
Authenticator or Яндекс Ключ. Lost phone: `manager.sh reset <email>`.
Someone left: `manager.sh disable <email>`. Everyone: `manager.sh list`.

## Everyday

- **Updating the site**: merge into `main` on GitHub. Within 5 minutes the
  server prepares the new version (code, server packages, built site) in its
  own folder next to the running one and switches to it in one step; database
  migrations run automatically. A failed update leaves the running version
  untouched and is retried in 5 minutes; if the new API does not start, the
  previous version is switched back. Packages are downloaded only when
  `package-lock.json` changes. Log: `journalctl -u buysun-update`.
  Force: `sudo -u buysun /opt/buysun/current/deploy/update.sh --force`.
- **Going back**: the last 5 builds stay in `/opt/buysun/releases`; the quickest
  way back is to revert the commit on GitHub.
- **Logs**: `journalctl -u buysun-api -f`, site requests in `/var/log/caddy/buysun.log`.
- **Restore**: `server/README.md`, section Backups.

## Files

| Path | What |
|---|---|
| `/opt/buysun/repo` | Git checkout the updates are fetched into |
| `/opt/buysun/current` | → the running version in `/opt/buysun/releases/`: code, server packages, the site Caddy serves (`site/`) |
| `/opt/buysun/cache` | Installed packages per `package-lock.json`, shared by versions as hard links |
| `/opt/buysun/shared/server.env` | Settings and secrets, readable only by `buysun` |
| `/var/lib/buysun/uploads` | Anketa PDFs and photos, readable only by `buysun`, never served |
| `/var/backups/buysun` | Local backups |
