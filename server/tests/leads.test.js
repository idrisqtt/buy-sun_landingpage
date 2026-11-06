const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { startTestApp, anketaPayload, dataUrl, JPEG, PDF } = require('./helpers')

describe('short forms', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.close() })

  it('stores a quick lead and sends it to Bitrix24 and email', async () => {
    const res = await t.post('/api/leads/quick', {
      name: 'Айгерим', phone: '8 (777) 123-45-67', consent: true, utm: { utm_source: 'tiktok' },
    })
    assert.equal(res.status, 201)
    await t.settle()

    const lead = await t.prisma.lead.findFirst()
    assert.equal(lead.type, 'quick')
    assert.equal(lead.phone, '+77771234567')
    assert.equal(lead.bitrix_status, 'sent')
    assert.equal(lead.bitrix_lead_id, 100)
    assert.equal(lead.email_status, 'sent')
    assert.ok(lead.consent_at)

    const add = t.bitrixServer.calls.find((c) => c.method === 'crm.lead.add')
    assert.equal(add.params.fields.TITLE, 'Заявка с сайта: Айгерим')
    assert.deepEqual(add.params.fields.PHONE, [{ VALUE: '+77771234567', VALUE_TYPE: 'MOBILE' }])
    assert.equal(add.params.fields.UTM_SOURCE, 'tiktok')
    assert.equal(add.params.fields.SOURCE_ID, 'WEB')
    assert.equal(t.mails.length, 1)
    assert.equal(t.mails[0].to, 'leads@buysun.test')
    assert.match(t.mails[0].subject, /Айгерим/)
  })

  it('stores a callback lead with only a phone', async () => {
    const res = await t.post('/api/leads/callback', { phone: '+7 701 000 00 01', consent: true })
    assert.equal(res.status, 201)
    await t.settle()
    const lead = await t.prisma.lead.findFirst({ where: { type: 'callback' } })
    assert.equal(lead.phone, '+77010000001')
    assert.equal(lead.bitrix_status, 'sent')
  })

  it('rejects a wrong phone and a missing consent without storing anything', async () => {
    const before = await t.prisma.lead.count()
    const bad = await t.post('/api/leads/callback', { phone: '123', consent: true })
    assert.equal(bad.status, 400)
    assert.equal(bad.body.fields[0].field, 'phone')
    const noConsent = await t.post('/api/leads/quick', { name: 'A', phone: '+77011234567' })
    assert.equal(noConsent.status, 400)
    assert.equal(await t.prisma.lead.count(), before)
  })

  it('pretends to accept a bot that filled the hidden field, but stores nothing', async () => {
    const before = await t.prisma.lead.count()
    const res = await t.post('/api/leads/quick', { name: 'Bot', phone: '+77011234567', consent: true, website: 'http://spam' })
    assert.equal(res.status, 201)
    assert.equal(await t.prisma.lead.count(), before)
  })

  it('refuses forms posted from another site', async () => {
    const res = await t.post('/api/leads/quick', { name: 'A', phone: '+77011234567', consent: true }, { Origin: 'https://evil.example' })
    assert.equal(res.status, 403)
  })

  it('escapes HTML and strips line breaks from user input', async () => {
    t.bitrixServer.calls.length = 0
    t.mails.length = 0
    await t.post('/api/leads/quick', { name: '<script>x</script>\r\nBcc: a@b.c', phone: '+77011234567', consent: true })
    await t.settle()
    const add = t.bitrixServer.calls.find((c) => c.method === 'crm.lead.add')
    assert.ok(!add.params.fields.COMMENTS.includes('<script>'))
    assert.ok(add.params.fields.COMMENTS.includes('&lt;script&gt;'))
    assert.ok(!/[\r\n]/.test(t.mails[0].subject))
    assert.ok(!t.mails[0].html.includes('<script>'))
  })
})

describe('anketa', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.close() })

  it('stores answers, PDF and photos and sends them to Bitrix24 and email', async () => {
    const res = await t.post('/api/leads/anketa', anketaPayload())
    assert.equal(res.status, 201)
    await t.settle()

    const lead = await t.prisma.lead.findFirst({ include: { files: true } })
    assert.equal(lead.type, 'anketa')
    assert.equal(lead.name, 'Ivan Petrov')
    assert.equal(lead.phone, '+77771234567')
    assert.equal(lead.email, 'ivan@example.com')
    assert.equal(lead.answers.city, 'Алматы')
    assert.equal(lead.answers.readyToWorkPermanently, true)
    assert.deepEqual(lead.files.map((f) => f.kind).sort(), ['full_body', 'pdf', 'selfie'])

    for (const file of lead.files) {
      const full = path.join(t.uploadDir, file.path)
      assert.equal(fs.statSync(full).mode & 0o777, 0o600)
      assert.equal(fs.statSync(full).size, file.size)
    }
    const pdfFile = lead.files.find((f) => f.kind === 'pdf')
    assert.deepEqual(fs.readFileSync(path.join(t.uploadDir, pdfFile.path)), PDF)

    const add = t.bitrixServer.calls.find((c) => c.method === 'crm.lead.add')
    assert.equal(add.params.fields.TITLE, 'Анкета: Ivan Petrov, Официант')
    assert.equal(add.params.fields.NAME, 'Ivan')
    assert.equal(add.params.fields.LAST_NAME, 'Petrov')
    assert.deepEqual(add.params.fields.EMAIL, [{ VALUE: 'ivan@example.com', VALUE_TYPE: 'WORK' }])
    assert.match(add.params.fields.COMMENTS, /Город:<\/b> Алматы/)
    assert.match(add.params.fields.COMMENTS, /Откуда узнал:<\/b> Социальные сети/)
    assert.match(add.params.fields.COMMENTS, /Пол:<\/b> Мужской/)
    assert.match(add.params.fields.COMMENTS, /Готов начать:<\/b> 15 мая/)
    assert.match(add.params.fields.COMMENTS, /Работать до:<\/b> 30 октября/)
    assert.match(add.params.fields.COMMENTS, /Дата рождения:<\/b> 15\.05\.1999/)
    assert.match(add.params.fields.COMMENTS, /Опыт 1:<\/b> Waiter, Rixos, Turkey; 2023 – 2024/)
    assert.match(add.params.fields.COMMENTS, /Кампания:<\/b> season2027/)
    assert.equal(add.params.fields.UTM_CAMPAIGN, 'season2027')

    const comment = t.bitrixServer.calls.find((c) => c.method === 'crm.timeline.comment.add')
    assert.equal(comment.params.fields.ENTITY_ID, lead.bitrix_lead_id)
    assert.equal(comment.params.fields.ENTITY_TYPE, 'lead')
    assert.equal(comment.params.fields.FILES.length, 3)
    const pdfInBitrix = comment.params.fields.FILES.find(([name]) => name.endsWith('.pdf'))
    assert.equal(pdfInBitrix[0], 'Анкета_Ivan_Petrov.pdf')
    assert.equal(pdfInBitrix[1], PDF.toString('base64'))

    assert.equal(t.mails.length, 1)
    assert.equal(t.mails[0].attachments.length, 3)
    assert.equal(lead.bitrix_status, 'sent')
    assert.equal(lead.email_status, 'sent')
  })

  it('marks a possible duplicate in the Bitrix24 lead', async () => {
    t.bitrixServer.handlers['crm.duplicate.findbycomm'] = () => ({ status: 200, body: { result: { LEAD: [42], CONTACT: [7] } } })
    await t.post('/api/leads/anketa', anketaPayload())
    await t.settle()
    delete t.bitrixServer.handlers['crm.duplicate.findbycomm']
    const add = t.bitrixServer.calls.filter((c) => c.method === 'crm.lead.add').pop()
    assert.match(add.params.fields.COMMENTS, /Возможный дубль.*лиды #42; контакты #7/)
  })

  it('rejects a file whose content does not match its type, leaving nothing behind', async () => {
    const before = await t.prisma.lead.count()
    const png = Buffer.from('89504e470d0a1a0a0000', 'hex')
    const res = await t.post('/api/leads/anketa', anketaPayload({ files: { selfie: dataUrl('image/jpeg', png) } }))
    assert.equal(res.status, 400)
    assert.equal(await t.prisma.lead.count(), before)
    const dirs = fs.existsSync(path.join(t.uploadDir, 'leads')) ? fs.readdirSync(path.join(t.uploadDir, 'leads')) : []
    assert.equal(dirs.length, before)
  })

  it('requires the PDF, the name and the consent', async () => {
    const noPdf = await t.post('/api/leads/anketa', anketaPayload({ files: { pdf: undefined } }))
    assert.equal(noPdf.status, 400)
    const noName = await t.post('/api/leads/anketa', anketaPayload({ answers: { firstName: '' } }))
    assert.equal(noName.status, 400)
    const noConsent = await t.post('/api/leads/anketa', anketaPayload({ top: { consent: false } }))
    assert.equal(noConsent.status, 400)
  })

  it('answers 413 to an oversized upload', async () => {
    const huge = 'data:image/jpeg;base64,' + 'A'.repeat(30 * 1024 * 1024)
    const res = await t.post('/api/leads/anketa', anketaPayload({ files: { selfie: huge } }))
    assert.equal(res.status, 413)
  })
})

describe('when Bitrix24 or email fail', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.close() })

  it('keeps the lead and still emails it when Bitrix24 is down', async () => {
    t.bitrixServer.handlers['crm.lead.add'] = () => ({ status: 500, body: { error: 'INTERNAL', error_description: 'down' } })
    const res = await t.post('/api/leads/anketa', anketaPayload())
    assert.equal(res.status, 201)
    await t.settle()
    delete t.bitrixServer.handlers['crm.lead.add']
    const lead = await t.prisma.lead.findFirst({ orderBy: { id: 'desc' } })
    assert.equal(lead.bitrix_status, 'failed')
    assert.match(lead.bitrix_error, /crm\.lead\.add: INTERNAL down/)
    assert.equal(lead.bitrix_lead_id, null)
    assert.equal(lead.email_status, 'sent')
    assert.ok(!lead.bitrix_error.includes('secret'), 'webhook secret must not leak into errors')
  })

  it('remembers the Bitrix24 lead id when only the files failed', async () => {
    t.bitrixServer.handlers['crm.timeline.comment.add'] = () => ({ status: 400, body: { error: 'ERROR_FILE' } })
    await t.post('/api/leads/anketa', anketaPayload())
    await t.settle()
    delete t.bitrixServer.handlers['crm.timeline.comment.add']
    const lead = await t.prisma.lead.findFirst({ orderBy: { id: 'desc' } })
    assert.equal(lead.bitrix_status, 'failed')
    assert.ok(lead.bitrix_lead_id > 0)
    assert.match(lead.bitrix_error, /создан, файлы не прикрепились/)
  })

  it('keeps the lead and records the email failure', async () => {
    t.mailBehaviour.fail = true
    await t.post('/api/leads/callback', { phone: '+77010000002', consent: true })
    await t.settle()
    t.mailBehaviour.fail = false
    const lead = await t.prisma.lead.findFirst({ orderBy: { id: 'desc' } })
    assert.equal(lead.email_status, 'failed')
    assert.equal(lead.email_error, 'SMTP down')
    assert.equal(lead.bitrix_status, 'sent')
  })
})

describe('without integrations configured', () => {
  let t
  before(async () => { t = await startTestApp({ bitrixEnabled: false, mailEnabled: false }) })
  after(async () => { await t.close() })

  it('stores the lead and marks both deliveries as skipped', async () => {
    await t.post('/api/leads/anketa', anketaPayload())
    await t.settle()
    const lead = await t.prisma.lead.findFirst()
    assert.equal(lead.bitrix_status, 'skipped')
    assert.equal(lead.email_status, 'skipped')
  })
})

describe('a burst of anketas and a restart', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.close() })

  it('sends a burst of anketas to Bitrix24 one at a time', async () => {
    let active = 0
    let most = 0
    t.bitrixServer.handlers['crm.lead.add'] = async () => {
      most = Math.max(most, ++active)
      await new Promise((r) => setTimeout(r, 40)) // a slow Bitrix24
      active--
      return null // the usual answer
    }
    const answers = await Promise.all(Array.from({ length: 6 }, () => t.post('/api/leads/anketa', anketaPayload())))
    assert.deepEqual(answers.map((a) => a.status), [201, 201, 201, 201, 201, 201])
    await t.settle()
    delete t.bitrixServer.handlers['crm.lead.add']
    assert.equal(most, 1, 'never more than one anketa in flight')
    assert.equal(await t.prisma.lead.count({ where: { bitrix_status: 'sent', email_status: 'sent' } }), 6)
  })

  it('after a restart sends what was left, without a second Bitrix24 lead', async () => {
    // As if the server stopped: one lead not sent at all, one already in
    // Bitrix24 but not emailed yet
    const fresh = await t.prisma.lead.create({ data: { type: 'callback', phone: '+77010000091', consent_at: new Date() } })
    const half = await t.prisma.lead.create({ data: { type: 'callback', phone: '+77010000092', consent_at: new Date(), bitrix_status: 'sent', bitrix_lead_id: 555 } })
    const addsBefore = t.bitrixServer.calls.filter((c) => c.method === 'crm.lead.add').length
    const mailsBefore = t.mails.length

    assert.equal(await t.delivery.resumePending(), 2)
    await t.settle()

    const adds = t.bitrixServer.calls.filter((c) => c.method === 'crm.lead.add').slice(addsBefore)
    assert.equal(adds.length, 1, 'only the lead never sent goes to Bitrix24')
    assert.match(adds[0].params.fields.TITLE, /\+77010000091/)
    assert.equal(t.mails.length - mailsBefore, 2, 'both are emailed')
    for (const id of [fresh.id, half.id]) {
      const lead = await t.prisma.lead.findUnique({ where: { id } })
      assert.equal(lead.bitrix_status, 'sent')
      assert.equal(lead.email_status, 'sent')
    }
    assert.equal((await t.prisma.lead.findUnique({ where: { id: half.id } })).bitrix_lead_id, 555)
    assert.equal(await t.delivery.resumePending(), 0, 'nothing left')
  })
})
