const { logger } = require('../utils/logger')
const { fileName } = require('../utils/leadText')

const shortError = (err) => String(err?.message || err).slice(0, 1000)

// Sends a stored lead to Bitrix24 and by email, and records the outcome of
// each in the database. The lead itself is already safe in the database, so a
// failure here never loses it.
function createDelivery({ prisma, storage, bitrix, mailer }) {
  async function loadFiles(lead) {
    return Promise.all(lead.files.map(async (file) => ({
      kind: file.kind,
      mime: file.mime,
      name: fileName(file, lead),
      buffer: await storage.read(file.path),
    })))
  }

  async function toBitrix(lead, files) {
    if (!bitrix) return { bitrix_status: 'skipped' }
    let bitrixLeadId = lead.bitrix_lead_id
    try {
      if (!bitrixLeadId) {
        bitrixLeadId = await bitrix.createLead(lead)
        await prisma.lead.update({ where: { id: lead.id }, data: { bitrix_lead_id: bitrixLeadId } })
      }
      await bitrix.attachFiles(bitrixLeadId, files)
      return { bitrix_status: 'sent', bitrix_error: null }
    } catch (err) {
      logger.error('Bitrix24 delivery failed', { leadId: lead.id, bitrixLeadId, error: shortError(err) })
      return {
        bitrix_status: 'failed',
        bitrix_error: bitrixLeadId ? `Лид #${bitrixLeadId} создан, файлы не прикрепились: ${shortError(err)}` : shortError(err),
      }
    }
  }

  async function toEmail(lead, files) {
    if (!mailer) return { email_status: 'skipped' }
    try {
      await mailer.sendLead(lead, files)
      return { email_status: 'sent', email_error: null }
    } catch (err) {
      logger.error('Email delivery failed', { leadId: lead.id, error: shortError(err) })
      return { email_status: 'failed', email_error: shortError(err) }
    }
  }

  return {
    async deliver(leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { files: true } })
      if (!lead) return
      const files = await loadFiles(lead)
      const [bitrixResult, emailResult] = await Promise.all([toBitrix(lead, files), toEmail(lead, files)])
      await prisma.lead.update({ where: { id: leadId }, data: { ...bitrixResult, ...emailResult } })
      logger.info('Lead delivered', { leadId, bitrix: bitrixResult.bitrix_status, email: emailResult.email_status })
    },
  }
}

module.exports = { createDelivery }
