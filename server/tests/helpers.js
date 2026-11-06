// Test setup: a separate database (buysun_test), a fake Bitrix24 and a fake
// mail transport. Needs the dev Postgres: docker compose -f docker-compose.dev.yml up -d
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { loadConfig } = require('../src/config')
const { createApp } = require('../src/app')
const { createPrisma } = require('../src/services/prisma')
const { createStorage } = require('../src/services/storage')
const { createBitrix } = require('../src/services/bitrix')
const { createMailer } = require('../src/services/mailer')
const { createDelivery } = require('../src/services/delivery')

const ADMIN_URL = process.env.TEST_ADMIN_DATABASE_URL || 'postgresql://buysun:buysun@localhost:5433/postgres'
const TEST_URL = process.env.TEST_DATABASE_URL || 'postgresql://buysun:buysun@localhost:5433/buysun_test'
const SITE = 'https://buysun.kz'

let prepared = false
async function prepareDatabase() {
  if (prepared) return
  const admin = createPrisma(ADMIN_URL)
  const exists = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = 'buysun_test'`
  if (exists.length === 0) await admin.$executeRawUnsafe('CREATE DATABASE buysun_test')
  await admin.$disconnect()
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: 'pipe',
  })
  prepared = true
}

// Fake Bitrix24: records every call; `handlers[method]` can override answers
function startFakeBitrix() {
  const calls = []
  const handlers = {}
  let nextLeadId = 100
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      const method = req.url.split('/').pop().replace(/\.json$/, '')
      const params = JSON.parse(body || '{}')
      calls.push({ method, params })
      const custom = await handlers[method]?.(params) // may wait, like a slow Bitrix24
      const answer = custom || (
        method === 'crm.lead.add' ? { status: 200, body: { result: nextLeadId++ } }
          : method === 'crm.duplicate.findbycomm' ? { status: 200, body: { result: [] } }
            : { status: 200, body: { result: true } })
      res.writeHead(answer.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(answer.body))
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ url: `http://127.0.0.1:${server.address().port}/rest/1/secret`, calls, handlers, close: () => server.close() })
  }))
}

async function startTestApp({ env = {}, bitrixEnabled = true, mailEnabled = true } = {}) {
  await prepareDatabase()
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buysun-uploads-'))
  const bitrixServer = await startFakeBitrix()
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: TEST_URL,
    UPLOAD_DIR: uploadDir,
    FRONTEND_URL: SITE,
    BITRIX_WEBHOOK_URL: bitrixEnabled ? bitrixServer.url : '',
    SMTP_HOST: mailEnabled ? 'smtp.test' : '',
    LEADS_EMAIL_TO: 'leads@buysun.test',
    MAIL_FROM: 'site@buysun.test',
    ...env,
  })
  const prisma = createPrisma(TEST_URL)
  await prisma.$executeRawUnsafe('TRUNCATE leads, lead_files RESTART IDENTITY CASCADE')
  const storage = createStorage(config.uploadDir)

  const mails = []
  const mailBehaviour = { fail: false }
  const transporter = {
    sendMail: async (message) => {
      if (mailBehaviour.fail) throw new Error('SMTP down')
      mails.push(message)
    },
  }
  const bitrix = config.bitrix ? createBitrix(config.bitrix) : null
  const mailer = config.mail ? createMailer(config.mail, { transporter }) : null

  const delivery = createDelivery({ prisma, storage, bitrix, mailer })

  const app = createApp({ config, prisma, storage, delivery })
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`

  const post = async (url, body, headers = {}) => {
    const response = await fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: SITE, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json().catch(() => null) }
  }

  // Waits until every lead sent so far went to Bitrix24 and email
  const settle = async () => {
    await new Promise((r) => setTimeout(r, 20))
    await delivery.idle()
  }

  return {
    config, prisma, storage, uploadDir, bitrixServer, mails, mailBehaviour, post, settle, delivery,
    async close() {
      await new Promise((resolve) => server.close(resolve))
      bitrixServer.close()
      await prisma.$disconnect()
      fs.rmSync(uploadDir, { recursive: true, force: true })
    },
  }
}

// Smallest files that pass the signature checks
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z', 'base64')
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
const dataUrl = (mime, buffer) => `data:${mime};base64,${buffer.toString('base64')}`

const anketaPayload = (overrides = {}) => ({
  answers: {
    firstName: 'Ivan',
    lastName: 'Petrov',
    phone: '+7 777 123 45 67',
    email: 'ivan@example.com',
    city: 'Алматы',
    desiredPosition: 'waiter',
    gender: 'male',
    birthDate: '1999-05-15',
    startMonth: '05',
    startDay: '15',
    endMonth: '10',
    endDay: '30',
    position1: 'Waiter',
    company1: 'Rixos',
    country1: 'Turkey',
    workStart1: '2023',
    workEnd1: '2024',
    readyToWorkPermanently: true,
    source: 'social',
    hobbies: 'Чтение',
    ...overrides.answers,
  },
  consent: true,
  utm: { utm_source: 'instagram', utm_campaign: 'season2027' },
  files: {
    pdf: dataUrl('application/pdf', PDF),
    selfie: dataUrl('image/jpeg', JPEG),
    full_body: dataUrl('image/jpeg', JPEG),
    ...overrides.files,
  },
  ...overrides.top,
})

module.exports = { startTestApp, anketaPayload, dataUrl, JPEG, PDF, SITE }
