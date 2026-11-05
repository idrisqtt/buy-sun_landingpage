#!/usr/bin/env node
// Checks the server every few minutes (systemd timer) and emails the client
// when something breaks, again every 12 hours while it stays broken, and once
// more when it is fixed. Without this nobody would notice a broken site:
// there is no paid server maintenance.
//
// It cannot report the server being completely down (it runs on it); for that
// an outside uptime monitor watches https://<site>/api/health (see deploy/README.md).
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const tls = require('tls')
const { execFileSync } = require('child_process')

const REPEAT_MS = 12 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

// ---- decision logic (pure, tested) ----

// state: { [checkName]: { since, lastSent } }, results: [{ name, ok, message }]
function decideAlerts(state, results, now = Date.now()) {
  const next = {}
  const problems = []
  const resolved = []
  for (const r of results) {
    const prev = state[r.name]
    if (r.ok) {
      if (prev) resolved.push(r)
      continue
    }
    const entry = prev ? { ...prev } : { since: now, lastSent: 0 }
    if (now - entry.lastSent >= REPEAT_MS) {
      problems.push({ ...r, since: entry.since })
      entry.lastSent = now
    }
    next[r.name] = entry
  }
  // A check that disappeared (e.g. a remote URL no longer configured) is dropped
  return { next, problems, resolved }
}

// ---- checks ----

// What each check means for the client, in plain words
const LABELS = {
  api: 'Приём заявок с сайта',
  site: 'Сайт',
  certificate: 'HTTPS-сертификат',
  disk: 'Место на диске сервера',
  backup: 'Резервные копии',
  jobs: 'Плановые задачи сервера',
  deliveries: 'Доставка заявок в Битрикс24 и на почту',
}

async function checkHttp(name, url, problem, timeoutMs = 15000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' })
    if (res.status >= 200 && res.status < 400) return { name, ok: true }
    return { name, ok: false, message: `${problem} (ошибка ${res.status})` }
  } catch (err) {
    return { name, ok: false, message: `${problem} (${err.cause?.code || err.message})` }
  }
}

function checkCertificate(host, minDays = 14) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      const days = Math.floor((new Date(cert.valid_to) - Date.now()) / (24 * HOUR))
      resolve(days >= minDays
        ? { name: 'certificate', ok: true }
        : { name: 'certificate', ok: false, message: `HTTPS-сертификат ${host} истекает через ${days} дн. и не продлевается` })
    })
    const fail = (err) => resolve({ name: 'certificate', ok: false, message: `Не удалось проверить сертификат ${host}: ${err.message || err}` })
    socket.on('error', fail)
    socket.on('timeout', () => { socket.destroy(); fail('timeout') })
  })
}

function checkDisk(dir, maxPercent = 85) {
  const { blocks, bavail } = fs.statfsSync(dir)
  const used = Math.round((1 - bavail / blocks) * 100)
  return used <= maxPercent
    ? { name: 'disk', ok: true }
    : { name: 'disk', ok: false, message: `Диск заполнен на ${used}%` }
}

function checkBackup(backupDir, maxAgeHours = 26) {
  let newest = 0
  try {
    for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const sums = path.join(backupDir, entry.name, 'SHA256SUMS')
      if (fs.existsSync(sums)) newest = Math.max(newest, fs.statSync(sums).mtimeMs)
    }
  } catch { /* no folder yet */ }
  const ageHours = (Date.now() - newest) / HOUR
  return ageHours <= maxAgeHours
    ? { name: 'backup', ok: true }
    : { name: 'backup', ok: false, message: newest ? `Последняя резервная копия ${Math.round(ageHours)} ч назад` : 'Резервных копий нет' }
}

function checkUnits(units) {
  const failed = units.filter((unit) => {
    try {
      execFileSync('systemctl', ['is-failed', '--quiet', unit])
      return true // exit 0 means "failed"
    } catch { return false }
  })
  return failed.length === 0
    ? { name: 'jobs', ok: true }
    : { name: 'jobs', ok: false, message: `Не выполнились задачи: ${failed.join(', ')} (journalctl -u <задача>)` }
}

async function checkDeliveries(prisma) {
  const since = new Date(Date.now() - 24 * HOUR)
  const [bitrix, email] = await Promise.all([
    prisma.lead.count({ where: { bitrix_status: 'failed', created_at: { gte: since } } }),
    prisma.lead.count({ where: { email_status: 'failed', created_at: { gte: since } } }),
  ])
  if (!bitrix && !email) return { name: 'deliveries', ok: true }
  const parts = []
  if (bitrix) parts.push(`${bitrix} не попали в Битрикс24`)
  if (email) parts.push(`${email} не ушли на почту`)
  return { name: 'deliveries', ok: false, message: `Заявки за сутки: ${parts.join(', ')}. Они сохранены в базе на сайте.` }
}

// ---- run ----

async function main() {
  const { loadConfig } = require('../src/config')
  const { createPrisma } = require('../src/services/prisma')
  const nodemailer = require('nodemailer')
  const { logger } = require('../src/utils/logger')

  const config = loadConfig()
  const site = process.env.SITE_URL || config.allowedOrigins[0]
  const backupDir = process.env.BACKUP_DIR || '/var/backups/buysun'
  const stateFile = path.join(config.uploadDir, '..', 'health-state.json')
  const prisma = createPrisma(config.databaseUrl)

  const results = await Promise.all([
    checkHttp('api', `http://127.0.0.1:${config.port}/api/health`, 'Сервер заявок не отвечает: формы и анкета на сайте не отправляются'),
    site ? checkHttp('site', site, `Сайт ${site} не открывается`) : null,
    site?.startsWith('https://') ? checkCertificate(new URL(site).hostname) : null,
    checkDisk(config.uploadDir),
    checkBackup(backupDir),
    checkUnits(['buysun-backup.service', 'buysun-update.service', 'buysun-restore-test.service']),
    checkDeliveries(prisma).catch((err) => ({ name: 'deliveries', ok: false, message: `База данных не отвечает: ${err.message}` })),
  ])
  await prisma.$disconnect()

  let state = {}
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) } catch { /* first run */ }
  const { next, problems, resolved } = decideAlerts(state, results.filter(Boolean))
  fs.writeFileSync(stateFile, JSON.stringify(next))

  for (const p of problems) logger.warn('Health problem', { check: p.name, message: p.message })
  if (!problems.length && !resolved.length) return

  const to = process.env.ALERT_EMAIL_TO || config.mail?.to
  if (!config.mail || !to) {
    logger.warn('Health alert not emailed: SMTP or ALERT_EMAIL_TO is not set')
    return
  }
  const lines = [
    ...problems.map((p) => `ПРОБЛЕМА: ${p.message} (с ${new Date(p.since).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })})`),
    ...resolved.map((r) => `ИСПРАВЛЕНО: ${LABELS[r.name] || r.name} снова в порядке`),
  ]
  await nodemailer.createTransport(config.mail.transport).sendMail({
    from: config.mail.from,
    to,
    subject: problems.length ? `[BUY SUN] Проблема на сайте: ${problems[0].message}`.replace(/[\r\n]+/g, ' ').slice(0, 200) : '[BUY SUN] Сайт снова работает нормально',
    text: `${lines.join('\n\n')}\n\n${problems.length ? 'Если проблема останется, напомним через 12 часов. Передайте это письмо исполнителю.' : 'Больше ничего делать не нужно.'}\n\nСообщение отправил сервер сайта ${site || ''}`,
  })
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { decideAlerts, checkBackup, checkDisk }
