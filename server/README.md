# BUY SUN server

Accepts the three forms of buysun.kz (“Оставьте заявку”, the phone form at the
bottom, the candidate anketa), stores every lead in Postgres (anketa PDF and
photos on disk) and passes it to Bitrix24 and to the work email. Managers open
and correct anketas in the cabinet at `/admin/`; each Bitrix24 lead links there.

The lead is stored **before** anything is sent: if Bitrix24 or email are down,
nothing is lost. The outcome of each delivery is kept in `leads.bitrix_status`
and `leads.email_status` (`sent`, `failed` with the reason in `*_error`,
`skipped` when the integration is not configured).

## Local development

```bash
cd server
docker compose -f docker-compose.dev.yml -p buysun-dev up -d   # Postgres 17 on 127.0.0.1:5433
cp .env.example .env
npm install
npx prisma migrate deploy && npx prisma generate
npm run dev                                                      # API on 127.0.0.1:3001
```

In another terminal `npm run dev` in the repository root starts the site;
Vite forwards `/api` to the server.

`npm test` runs the tests against a separate `buysun_test` database in the same
Postgres, with a fake Bitrix24 and a fake mail server.

## API

| Request | Body |
|---|---|
| `POST /api/leads/quick` | `{ name, phone, consent: true, utm? }` |
| `POST /api/leads/callback` | `{ phone, consent: true, utm? }` |
| `POST /api/leads/anketa` | `{ answers, consent: true, utm?, files: { pdf, selfie?, full_body?, additional? } }`, files as `data:` URLs (PDF ≤ 8 MB, JPEG ≤ 4 MB) |
| `GET /api/health` | `{ status: "ok" }` when the database answers |

Manager cabinet (`/admin/` on the site), all under `/api/admin`, session in an
httpOnly cookie, every change needs the `X-Requested-With: buysun-admin` header:

| Request | What |
|---|---|
| `POST /login`, `/password`, `/2fa/setup`, `/2fa/confirm`, `/code`, `/logout`, `GET /me` | Logging in: password, new password on first login, phone app (TOTP) once, then the code every time |
| `GET /leads?q=&type=&page=` | List and search by name, phone, email or number |
| `GET /leads/:id`, `GET /leads/:id/files/:fileId` | One lead with files, Bitrix24 link and change history; a stored file |
| `PUT /leads/:id` | Save an edited anketa: answers, the new PDF (built in the browser), replaced photos |

Security of the cabinet: the code from the phone is required for everyone and
cannot be reused; 5 wrong passwords or codes lock the account for 15 minutes;
sessions end after 2 idle hours or 12 hours; passwords are scrypt hashes;
every edit is recorded with who and what. Anketa files are only given to a
logged-in manager.

Spam protection: hidden `website` field (bots get a fake “ok”), 10 forms per
15 minutes per IP, forms from other sites refused by `Origin`, strict
validation, and the real file type of every upload is checked.

## Managers

```bash
node scripts/manager.js add anna@buysun.kz "Анна Ли"   # prints a temporary password
node scripts/manager.js reset anna@buysun.kz           # lost phone or password
node scripts/manager.js disable anna@buysun.kz         # left the company
node scripts/manager.js list
```

On the first login the cabinet asks for a new password and to connect
Google Authenticator or Яндекс Ключ. On the server use
`sudo -u buysun /opt/buysun/current/deploy/manager.sh` with the same arguments.

## Settings (.env)

See `.env.example`. In production `FRONTEND_URL=https://buysun.kz` is required.

**Bitrix24.** In Bitrix24: Applications → Developer resources → Other →
Incoming webhook, scope **CRM**. Put the URL into `BITRIX_WEBHOOK_URL`; keep it
secret. Each form creates a lead (source “Веб-сайт”, utm fields filled), with
all answers in the comment and a warning when the phone already exists in
leads or contacts. The anketa PDF and photos are attached to the lead’s
timeline. The Essentials plan has no REST API: there, leave the URL empty and
leads arrive by email only.

**Email.** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `LEADS_EMAIL_TO`. Every lead
is emailed with the anketa PDF and photos attached.

**Retention.** `RETENTION_DAYS=365` deletes leads and their files older than a
year, once a day. Empty keeps everything; the period is the client’s decision
(personal data).

## Backups

`scripts/backup.sh` dumps the database into `BACKUP_DIR/<date>/` with an
`uploads/` folder of the anketa files and keeps `BACKUP_KEEP_DAYS` days. Each
night looks like a full copy, but unchanged files are hard links to the night
before, so every file takes disk space once (14 full copies would fill a small
server after a few hundred anketas). Needs `rsync`.

With `BACKUP_REMOTE` (an rclone **crypt** remote: the copies hold personal data)
the off-site storage gets `db/<date>/` every night, `uploads/` with only the new
files sent, and `uploads-removed/<date>/` with files deleted or replaced that
night, kept `BACKUP_KEEP_DAYS` days. To restore an older night from there, take
`db/<date>` plus `uploads/` plus everything in `uploads-removed/` newer than
that date.

```cron
30 3 * * * /opt/buysun/server/scripts/backup.sh >> /var/log/buysun-backup.log 2>&1
```

`scripts/restore-test.sh` restores the latest backup into a temporary database
and folder and checks that every lead and file came back (`--remote` tests the
latest off-site copy). Run it after setting up backups and then every few
months. `scripts/restore.sh <folder>` restores for real and asks before
replacing live data.

`pg_dump` must have the same major version as the Postgres server; the scripts
stop with a clear message otherwise.
