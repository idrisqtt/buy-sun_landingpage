const { describe, it, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { normalizePhone, decodeDataUrl } = require('../src/utils/validation')
const { loadConfig } = require('../src/config')
const { deleteOldLeads } = require('../src/services/cleanup')
const { startTestApp, anketaPayload, JPEG } = require('./helpers')

describe('normalizePhone', () => {
  it('brings Kazakhstan numbers to +7XXXXXXXXXX', () => {
    assert.equal(normalizePhone('8 (777) 123-45-67'), '+77771234567')
    assert.equal(normalizePhone('+7 777 123 45 67'), '+77771234567')
    assert.equal(normalizePhone('7771234567'), '+77771234567')
  })
  it('keeps other countries and rejects junk', () => {
    assert.equal(normalizePhone('+90 532 123 45 67'), '+905321234567')
    assert.equal(normalizePhone('12345'), null)
    assert.equal(normalizePhone('+7 (777) 777 77 77 77 77 77'), null)
  })
})

describe('decodeDataUrl', () => {
  it('accepts a real JPEG', () => {
    const file = decodeDataUrl('selfie', `data:image/jpeg;base64,${JPEG.toString('base64')}`)
    assert.equal(file.mime, 'image/jpeg')
    assert.deepEqual(file.buffer, JPEG)
  })
  it('rejects a wrong declared type', () => {
    assert.throws(() => decodeDataUrl('selfie', `data:image/png;base64,${JPEG.toString('base64')}`), { status: 400 })
    assert.throws(() => decodeDataUrl('pdf', `data:application/pdf;base64,${JPEG.toString('base64')}`), { status: 400 })
  })
})

describe('loadConfig', () => {
  it('requires FRONTEND_URL in production', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x' }), /FRONTEND_URL/)
  })
  it('turns integrations off when their settings are empty', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', BITRIX_WEBHOOK_URL: '', SMTP_HOST: '', RETENTION_DAYS: '' })
    assert.equal(config.bitrix, null)
    assert.equal(config.mail, null)
    assert.equal(config.retentionDays, null)
  })
  it('rejects a broken webhook URL', () => {
    assert.throws(() => loadConfig({ DATABASE_URL: 'postgresql://x', BITRIX_WEBHOOK_URL: 'not a url' }), /BITRIX_WEBHOOK_URL/)
  })
})

describe('deleteOldLeads', () => {
  let t
  after(async () => { await t.close() })

  it('deletes leads and files older than the retention period and keeps the rest', async () => {
    t = await startTestApp({ bitrixEnabled: false, mailEnabled: false })
    await t.post('/api/leads/anketa', anketaPayload())
    await t.post('/api/leads/anketa', anketaPayload())
    await t.settle()
    const [oldLead, newLead] = await t.prisma.lead.findMany({ orderBy: { id: 'asc' } })
    await t.prisma.lead.update({ where: { id: oldLead.id }, data: { created_at: new Date(Date.now() - 400 * 86400000) } })

    const deleted = await deleteOldLeads({ prisma: t.prisma, storage: t.storage, retentionDays: 365 })
    assert.equal(deleted, 1)
    assert.equal(await t.prisma.lead.count({ where: { id: oldLead.id } }), 0)
    assert.equal(await t.prisma.leadFile.count({ where: { lead_id: oldLead.id } }), 0)
    assert.ok(!fs.existsSync(path.join(t.uploadDir, 'leads', String(oldLead.id))))
    assert.ok(fs.existsSync(path.join(t.uploadDir, 'leads', String(newLead.id))))
  })
})
