export const TYPE_LABELS = {
  anketa: 'Анкета',
  callback: 'Обратный звонок',
  quick: 'Оставьте заявку',
}

// Advertising tags in words, as in Bitrix24 and the email
export const UTM_LABELS = {
  utm_source: 'Источник рекламы',
  utm_medium: 'Тип рекламы',
  utm_campaign: 'Кампания',
  utm_content: 'Объявление',
  utm_term: 'Ключевое слово',
}

export const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', {
  timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const BITRIX = {
  sent: ['ok', 'Битрикс24'],
  failed: ['bad', 'Не дошла в Битрикс24'],
  pending: ['wait', 'Отправляется в Битрикс24'],
  skipped: ['off', 'Битрикс24 не подключён'],
}
const EMAIL = {
  sent: ['ok', 'Почта'],
  failed: ['bad', 'Не ушла на почту'],
  pending: ['wait', 'Отправляется на почту'],
  skipped: ['off', 'Почта не подключена'],
}

// Where the lead went: green when delivered, red when it did not reach
export function DeliveryBadges({ lead, compact = false }) {
  const items = [[BITRIX, lead.bitrix_status, lead.bitrix_error], [EMAIL, lead.email_status]]
  return (
    <span className={`cab-badges${compact ? ' compact' : ''}`}>
      {items.map(([map, status, detail]) => {
        const [tone, label] = map[status] || ['off', status]
        if (compact && tone === 'off') return null
        return <span key={label} className={`cab-badge ${tone}`} title={detail || label}>{label}</span>
      })}
    </span>
  )
}
