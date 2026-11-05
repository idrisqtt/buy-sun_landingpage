const nodemailer = require('nodemailer')
const { esc, oneLine, leadTitle, leadRows } = require('../utils/leadText')

// Email copy of every lead: a safety net if Bitrix24 is down or misconfigured.
function createMailer({ transport, from, to }, { transporter } = {}) {
  const mail = transporter || nodemailer.createTransport({ ...transport, pool: true, maxConnections: 2 })

  const buildHtml = (lead) => {
    const rows = leadRows(lead).map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5eaf0;color:#5f6b76;vertical-align:top;width:200px">${esc(label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5eaf0;color:#1f2937">${esc(value)}</td>
      </tr>`).join('')
    const date = new Date(lead.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'short', timeStyle: 'short' })
    return `<div style="font-family:Arial,sans-serif;font-size:14px;max-width:720px">
      <h2 style="color:#03487D;margin:0 0 4px">${esc(leadTitle(lead))}</h2>
      <p style="color:#5f6b76;margin:0 0 16px">${esc(date)}, Алматы</p>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
    </div>`
  }

  return {
    async sendLead(lead, attachments = []) {
      await mail.sendMail({
        from,
        to,
        subject: oneLine(`[BUY SUN] ${leadTitle(lead)}`),
        html: buildHtml(lead),
        text: leadRows(lead).map(([label, value]) => `${label}: ${value}`).join('\n'),
        attachments: attachments.map((file) => ({ filename: file.name, content: file.buffer, contentType: file.mime })),
      })
    },
  }
}

module.exports = { createMailer }
