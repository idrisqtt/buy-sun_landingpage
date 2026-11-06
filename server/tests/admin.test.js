const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { startTestApp, anketaPayload, dataUrl, JPEG, PDF } = require('./helpers')
const { hashPassword, totpFor } = require('../src/services/auth')

const TEMP = 'temporary-pass-1'
const NEW = 'my-new-password-2026'
const code = (secret, email, offsetSteps = 0) => totpFor(secret, email).generate({ timestamp: Date.now() + offsetSteps * 30000 })

async function addManager(t, email, extra = {}) {
  return t.prisma.user.create({ data: { email, name: 'Анна', password_hash: await hashPassword(TEMP), ...extra } })
}

// Logs a new manager in through every first-time step; returns the client and secret
async function firstLogin(t, email) {
  const c = t.cabinet()
  assert.equal((await c.call('POST', '/api/admin/login', { email, password: TEMP })).body.next, 'password')
  assert.equal((await c.call('POST', '/api/admin/password', { password: NEW })).body.next, 'setup-2fa')
  const setup = await c.call('POST', '/api/admin/2fa/setup')
  const done = await c.call('POST', '/api/admin/2fa/confirm', { code: code(setup.body.secret, email) })
  assert.equal(done.body.next, null)
  return { c, secret: setup.body.secret }
}

describe('cabinet login', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.close() })

  it('walks a new manager through password change and phone code setup', async () => {
    await addManager(t, 'anna@buysun.test')
    const c = t.cabinet()
    const login = await c.call('POST', '/api/admin/login', { email: 'ANNA@buysun.test ', password: TEMP })
    assert.equal(login.status, 200)
    assert.equal(login.body.next, 'password')
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i)
    assert.match(login.headers.get('set-cookie'), /SameSite=Strict/i)

    assert.equal((await c.call('GET', '/api/admin/leads')).status, 401, 'no data before the code')
    assert.equal((await c.call('POST', '/api/admin/password', { password: 'short' })).status, 400)
    assert.equal((await c.call('POST', '/api/admin/password', { password: NEW })).body.next, 'setup-2fa')

    const setup = await c.call('POST', '/api/admin/2fa/setup')
    assert.match(setup.body.qr, /^data:image\/png;base64,/)
    assert.match(setup.body.uri, /^otpauth:\/\/totp\/BUY%20SUN:anna%40buysun\.test\?/)
    assert.equal((await c.call('POST', '/api/admin/2fa/confirm', { code: '000000' })).status, 401)

    const before = c.cookie
    const ok = await c.call('POST', '/api/admin/2fa/confirm', { code: code(setup.body.secret, 'anna@buysun.test') })
    assert.equal(ok.body.next, null)
    assert.notEqual(c.cookie, before, 'a new session value after login')
    assert.equal((await c.call('GET', '/api/admin/leads')).status, 200)
    assert.equal(ok.headers.get('cache-control'), 'no-store')
  })

  it('asks for the code on the next login and refuses a code used before', async () => {
    const { secret } = await firstLogin(t, (await addManager(t, 'boris@buysun.test')).email)
    const used = code(secret, 'boris@buysun.test')
    const c = t.cabinet()
    assert.equal((await c.call('POST', '/api/admin/login', { email: 'boris@buysun.test', password: NEW })).body.next, 'code')
    assert.equal((await c.call('POST', '/api/admin/code', { code: used })).status, 401, 'same code twice')
    assert.equal((await c.call('POST', '/api/admin/code', { code: code(secret, 'boris@buysun.test', 1) })).body.next, null)
  })

  it('locks the account for 15 minutes after 5 wrong passwords', async () => {
    await addManager(t, 'vera@buysun.test')
    const c = t.cabinet()
    for (let i = 0; i < 5; i++) {
      assert.equal((await c.call('POST', '/api/admin/login', { email: 'vera@buysun.test', password: 'wrong' })).status, 401)
    }
    const locked = await c.call('POST', '/api/admin/login', { email: 'vera@buysun.test', password: TEMP })
    assert.equal(locked.status, 423)
  })

  it('gives the same answer for an unknown email and a wrong password', async () => {
    const unknown = await t.cabinet().call('POST', '/api/admin/login', { email: 'nobody@buysun.test', password: 'x' })
    assert.equal(unknown.status, 401)
    assert.equal(unknown.body.error, 'Неверный email или пароль')
  })

  it('refuses changes without the cabinet header', async () => {
    const res = await t.cabinet().call('POST', '/api/admin/login', { email: 'anna@buysun.test', password: NEW }, { header: false })
    assert.equal(res.status, 403)
  })

  it('logs out after 2 idle hours, on logout, and when access is closed', async () => {
    const user = await addManager(t, 'gleb@buysun.test')
    const { c } = await firstLogin(t, user.email)
    await t.prisma.session.updateMany({ where: { user_id: user.id }, data: { last_seen_at: new Date(Date.now() - 3 * 3600 * 1000) } })
    assert.equal((await c.call('GET', '/api/admin/leads')).status, 401)

    await t.prisma.user.update({ where: { id: user.id }, data: { totp_last_step: null } })
    const second = await firstLoginAgain(t, user.email)
    await second.call('POST', '/api/admin/logout')
    assert.equal((await second.call('GET', '/api/admin/leads')).status, 401)

    const third = await firstLoginAgain(t, user.email)
    await t.prisma.user.update({ where: { id: user.id }, data: { disabled: true } })
    assert.equal((await third.call('GET', '/api/admin/leads')).status, 401)
  })
})

async function firstLoginAgain(t, email) {
  const user = await t.prisma.user.findUnique({ where: { email } })
  const c = t.cabinet()
  await c.call('POST', '/api/admin/login', { email, password: NEW })
  const step = Math.floor(Date.now() / 30000)
  const offset = user.totp_last_step != null && user.totp_last_step >= step ? user.totp_last_step - step + 1 : 0
  assert.equal((await c.call('POST', '/api/admin/code', { code: code(user.totp_secret, email, offset) })).body.next, null)
  return c
}

describe('cabinet anketas', () => {
  let t, c, leadId
  before(async () => {
    t = await startTestApp()
    await t.post('/api/leads/anketa', anketaPayload({ top: { selfieFocus: { x: 0.4, y: 0.3 } } }))
    await t.post('/api/leads/callback', { phone: '+7 701 000 00 09', consent: true })
    await t.settle()
    leadId = (await t.prisma.lead.findFirst({ where: { type: 'anketa' } })).id
    await addManager(t, 'anna@buysun.test')
    c = (await firstLogin(t, 'anna@buysun.test')).c
  })
  after(async () => { await t.close() })

  it('links the Bitrix24 lead to the anketa in the cabinet', async () => {
    const add = t.bitrixServer.calls.find((call) => call.method === 'crm.lead.add')
    assert.match(add.params.fields.COMMENTS, new RegExp(`Открыть и исправить анкету в кабинете:.*https://buysun\\.kz/admin/#/leads/${leadId}`))
  })

  it('lists and finds leads by name, phone and number', async () => {
    const all = await c.call('GET', '/api/admin/leads')
    assert.equal(all.body.total, 2)
    assert.equal(all.body.items.find((i) => i.type === 'anketa').position, 'Официант')
    assert.equal((await c.call('GET', '/api/admin/leads?q=petrov')).body.total, 1)
    assert.equal((await c.call('GET', '/api/admin/leads?q=8 777 123-45-67')).body.total, 1)
    // A phone typed as digits only, without "+": not taken for a lead number
    assert.equal((await c.call('GET', '/api/admin/leads?q=7771234567')).body.total, 1)
    assert.equal((await c.call('GET', '/api/admin/leads?q=87771234567')).body.total, 1)
    assert.equal((await c.call('GET', `/api/admin/leads?q=%23${leadId}`)).body.items[0].id, leadId)
    assert.equal((await c.call('GET', '/api/admin/leads?type=callback')).body.total, 1)
  })

  it('opens an anketa with its files, selfie position and Bitrix24 link', async () => {
    const lead = (await c.call('GET', `/api/admin/leads/${leadId}`)).body
    assert.equal(lead.answers.firstName, 'Ivan')
    assert.deepEqual(lead.files.map((f) => f.kind).sort(), ['full_body', 'pdf', 'selfie'])
    assert.deepEqual(lead.files.find((f) => f.kind === 'selfie').focus, { x: 0.4, y: 0.3 })
    assert.match(lead.bitrix_url, /^http:\/\/127\.0\.0\.1:\d+\/crm\/lead\/details\/\d+\/$/)
    const pdf = await c.call('GET', `/api/admin/leads/${leadId}/files/${lead.files.find((f) => f.kind === 'pdf').id}`)
    assert.equal(pdf.headers.get('content-type'), 'application/pdf')
    assert.deepEqual(pdf.body, PDF)
  })

  it('saves an edited anketa with a new PDF and a replaced photo, and records who did it', async () => {
    const before = (await c.call('GET', `/api/admin/leads/${leadId}`)).body
    const oldFullBody = await t.prisma.leadFile.findFirst({ where: { lead_id: leadId, kind: 'full_body' } })
    const newPdf = Buffer.concat([PDF, Buffer.from('% edited\n')])
    const res = await c.call('PUT', `/api/admin/leads/${leadId}`, {
      answers: { ...before.answers, desiredPosition: 'bartender', lastName: 'Petrova', phone: '+7 777 123 45 67' },
      selfieFocus: { x: 0.5, y: 0.25 },
      files: { pdf: dataUrl('application/pdf', newPdf), full_body: dataUrl('image/jpeg', JPEG) },
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.name, 'Ivan Petrova')
    assert.equal(res.body.answers.desiredPosition, 'bartender')
    assert.deepEqual(res.body.files.find((f) => f.kind === 'selfie').focus, { x: 0.5, y: 0.25 })
    assert.equal(res.body.files.filter((f) => f.kind === 'full_body').length, 1)
    assert.ok(!fs.existsSync(path.join(t.uploadDir, oldFullBody.path)), 'the replaced photo is deleted')
    const pdfFile = res.body.files.find((f) => f.kind === 'pdf')
    assert.deepEqual((await c.call('GET', `/api/admin/leads/${leadId}/files/${pdfFile.id}`)).body, newPdf)

    const [event] = res.body.events
    assert.equal(event.action, 'edited')
    assert.equal(event.user, 'Анна')
    assert.deepEqual(event.details.fields.sort(), ['Желаемая вакансия', 'Фамилия'])
    assert.deepEqual(event.details.files, ['фото в полный рост'])
  })

  it('refuses to edit a short form lead and bad files', async () => {
    const callback = await t.prisma.lead.findFirst({ where: { type: 'callback' } })
    const lead = (await c.call('GET', `/api/admin/leads/${leadId}`)).body
    const body = { answers: lead.answers, files: { pdf: dataUrl('application/pdf', PDF) } }
    assert.equal((await c.call('PUT', `/api/admin/leads/${callback.id}`, body)).status, 400)
    const png = Buffer.from('89504e470d0a1a0a0000', 'hex')
    assert.equal((await c.call('PUT', `/api/admin/leads/${leadId}`, { ...body, files: { ...body.files, selfie: dataUrl('image/jpeg', png) } })).status, 400)
    assert.equal((await c.call('GET', '/api/admin/leads/999999')).status, 404)
  })
})
