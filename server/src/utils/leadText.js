const { anketaRows, positionLabel } = require('./anketaFields')

const TYPE_LABELS = {
  quick: 'Заявка «Оставьте заявку»',
  callback: 'Обратный звонок',
  anketa: 'Анкета кандидата',
}

const UTM_LABELS = {
  utm_source: 'Источник рекламы',
  utm_medium: 'Тип рекламы',
  utm_campaign: 'Кампания',
  utm_content: 'Объявление',
  utm_term: 'Ключевое слово',
}

const FILE_NAMES = {
  pdf: 'Анкета',
  selfie: 'Фото лицо',
  full_body: 'Фото в полный рост',
  additional: 'Фото дополнительное',
}

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Removes line breaks so user input can never add email headers
const oneLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim()

const personName = (lead) => {
  if (lead.type === 'anketa' && lead.answers) {
    return oneLine(`${lead.answers.firstName || ''} ${lead.answers.lastName || ''}`)
  }
  return oneLine(lead.name || '')
}

const leadTitle = (lead) => {
  const who = personName(lead) || lead.phone
  if (lead.type === 'anketa') {
    const position = oneLine(positionLabel(lead.answers))
    return `Анкета: ${who}${position ? `, ${position}` : ''}`
  }
  if (lead.type === 'callback') return `Обратный звонок: ${lead.phone}`
  return `Заявка с сайта: ${who}`
}

// Every field of the lead as [label, value] rows
const leadRows = (lead) => {
  const rows = [['Форма', TYPE_LABELS[lead.type]], ['Номер на сайте', `#${lead.id}`]]
  if (lead.type === 'anketa') {
    rows.push(...anketaRows({ ...lead.answers, phone: lead.phone }))
  } else {
    if (lead.name) rows.push(['Имя', lead.name])
    rows.push(['Телефон', lead.phone])
  }
  for (const [key, label] of Object.entries(UTM_LABELS)) {
    if (lead.utm?.[key]) rows.push([label, lead.utm[key]])
  }
  return rows
}

const fileName = (file, lead) => {
  const who = personName(lead).replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, '_') || `lead_${lead.id}`
  const ext = file.mime === 'application/pdf' ? 'pdf' : 'jpg'
  return `${FILE_NAMES[file.kind] || file.kind} ${who}.${ext}`.replace(/\s+/g, '_')
}

module.exports = { TYPE_LABELS, esc, oneLine, personName, leadTitle, leadRows, fileName }
