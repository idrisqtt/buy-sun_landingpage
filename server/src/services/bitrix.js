const { logger } = require('../utils/logger')
const { esc, leadTitle, leadRows } = require('../utils/leadText')

// Bitrix24 REST through an incoming webhook (scope "crm").
// The webhook URL is a secret: it is never logged.
function createBitrix({ webhookUrl, assignedById, cabinetUrl }, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  async function call(method, params) {
    const response = await fetchImpl(`${webhookUrl}/${method}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(timeoutMs),
    })
    let body = null
    try { body = await response.json() } catch { /* not JSON */ }
    if (!response.ok || !body || body.error) {
      const reason = body?.error ? `${body.error} ${body.error_description || ''}` : `HTTP ${response.status}`
      throw new Error(`Bitrix24 ${method}: ${reason.trim()}`)
    }
    return body.result
  }

  // Existing leads and contacts with the same phone. Bitrix24 answers with an
  // empty array when there are none. A failure here must not stop the lead.
  async function findDuplicates(phone) {
    try {
      const result = await call('crm.duplicate.findbycomm', { type: 'PHONE', values: [phone] })
      return { leads: result?.LEAD || [], contacts: result?.CONTACT || [] }
    } catch (err) {
      logger.warn('Bitrix24 duplicate search failed', { error: err.message })
      return { leads: [], contacts: [] }
    }
  }

  function buildFields(lead, duplicates) {
    const lines = []
    if (duplicates.leads.length || duplicates.contacts.length) {
      const parts = []
      if (duplicates.leads.length) parts.push(`лиды ${duplicates.leads.map((id) => `#${id}`).join(', ')}`)
      if (duplicates.contacts.length) parts.push(`контакты ${duplicates.contacts.map((id) => `#${id}`).join(', ')}`)
      lines.push(`<b>Возможный дубль, этот телефон уже есть:</b> ${parts.join('; ')}`)
    }
    if (lead.type === 'anketa' && cabinetUrl) {
      const url = cabinetUrl(lead.id)
      lines.push(`<b>Открыть и исправить анкету в кабинете:</b> <a href="${esc(url)}">${esc(url)}</a>`)
    }
    for (const [label, value] of leadRows(lead)) lines.push(`<b>${esc(label)}:</b> ${esc(value)}`)

    const answers = lead.answers || {}
    const fields = {
      TITLE: leadTitle(lead),
      NAME: lead.type === 'anketa' ? answers.firstName : lead.name || undefined,
      LAST_NAME: lead.type === 'anketa' ? answers.lastName : undefined,
      PHONE: [{ VALUE: lead.phone, VALUE_TYPE: 'MOBILE' }],
      EMAIL: lead.email ? [{ VALUE: lead.email, VALUE_TYPE: 'WORK' }] : undefined,
      SOURCE_ID: 'WEB',
      SOURCE_DESCRIPTION: `buysun.kz, форма #${lead.id}`,
      COMMENTS: lines.join('<br>'),
      OPENED: 'Y',
      ASSIGNED_BY_ID: assignedById,
    }
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (lead.utm?.[key]) fields[key.toUpperCase()] = lead.utm[key]
    }
    return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''))
  }

  return {
    call,

    async createLead(lead) {
      const duplicates = await findDuplicates(lead.phone)
      const id = await call('crm.lead.add', {
        fields: buildFields(lead, duplicates),
        params: { REGISTER_SONET_EVENT: 'Y' },
      })
      return Number(id)
    },

    // PDF and photos go to the lead's timeline as one comment with files
    async attachFiles(bitrixLeadId, files) {
      if (files.length === 0) return
      await call('crm.timeline.comment.add', {
        fields: {
          ENTITY_ID: bitrixLeadId,
          ENTITY_TYPE: 'lead',
          COMMENT: 'Анкета и фото кандидата с сайта buysun.kz',
          FILES: files.map((file) => [file.name, file.buffer.toString('base64')]),
        },
      })
    },
  }
}

module.exports = { createBitrix }
