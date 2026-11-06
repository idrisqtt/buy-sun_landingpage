const { logger } = require('../utils/logger')
const { fileName } = require('../utils/leadText')

const shortError = (err) => String(err?.message || err).slice(0, 1000)

// Sends a stored lead to Bitrix24 and by email, and records the outcome of
// each in the database. The lead itself is already safe in the database, so a
// failure here never loses it.
//
// Leads are sent one at a time from a queue: an anketa carries several
// megabytes of files, and a burst of anketas must not fill the memory of a
// small server. What is not sent yet stays "pending" in the database, and
// resumePending() picks it up after a restart (deploy, reboot, crash).
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

  // Only the parts still pending: after a restart a lead already in Bitrix24
  // is not sent there again
  async function deliver(leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { files: true } })
    if (!lead) return
    const toBitrixNow = lead.bitrix_status === 'pending'
    const toEmailNow = lead.email_status === 'pending'
    if (!toBitrixNow && !toEmailNow) return
    const files = await loadFiles(lead)
    const [bitrixResult, emailResult] = await Promise.all([
      toBitrixNow ? toBitrix(lead, files) : {},
      toEmailNow ? toEmail(lead, files) : {},
    ])
    await prisma.lead.update({ where: { id: leadId }, data: { ...bitrixResult, ...emailResult } })
    logger.info('Lead delivered', { leadId, bitrix: bitrixResult.bitrix_status, email: emailResult.email_status })
  }

  const queue = []
  let running = null

  function kick() {
    if (running) return running
    running = (async () => {
      while (queue.length) {
        const leadId = queue.shift()
        try {
          await deliver(leadId)
        } catch (err) {
          logger.error('Delivery crashed', { leadId, error: shortError(err) })
        }
      }
    })().finally(() => {
      running = null
      if (queue.length) kick() // a lead added while the queue was finishing
    })
    return running
  }

  return {
    deliver,

    // Called right after a lead is stored; never throws
    enqueue(leadId) {
      if (!queue.includes(leadId)) queue.push(leadId)
      kick()
    },

    // At start: everything not yet sent, oldest first
    async resumePending() {
      const pending = await prisma.lead.findMany({
        where: { OR: [{ bitrix_status: 'pending' }, { email_status: 'pending' }] },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
      for (const { id } of pending) this.enqueue(id)
      if (pending.length) logger.info('Sending leads left from before the restart', { count: pending.length })
      return pending.length
    },

    // Resolves when the queue is empty (shutdown, tests)
    async idle() {
      while (running) await running
    },
  }
}

module.exports = { createDelivery }
