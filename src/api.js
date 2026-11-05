// Sending forms to the BUY SUN server (server/ folder): it stores every lead
// and passes it to Bitrix24 and to the work email.

export const WHATSAPP_NUMBER = '77026677171'
export const whatsappLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`

const UTM_KEY = 'buysun-utm'
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

// Remember the ad campaign from the first page the person opened, so a form
// sent later still shows in Bitrix24 which ad brought them.
export const rememberUtm = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm = Object.fromEntries(UTM_FIELDS.filter((key) => params.get(key)).map((key) => [key, params.get(key).slice(0, 200)]))
    if (Object.keys(utm).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
  } catch { /* storage blocked: leads just go without utm */ }
}

const getUtm = () => {
  try { return JSON.parse(sessionStorage.getItem(UTM_KEY)) || undefined } catch { return undefined }
}

export class SendError extends Error {}

// POST to /api/leads/<kind>. Throws SendError with a message for the person.
export async function sendLead(kind, body) {
  let response
  try {
    response = await fetch(`/api/leads/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, consent: true, utm: getUtm() }),
    })
  } catch {
    throw new SendError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.')
  }
  if (response.ok) return
  const data = await response.json().catch(() => null)
  const fieldMessage = data?.fields?.[0]?.message
  throw new SendError(fieldMessage || data?.error || 'Не удалось отправить. Попробуйте ещё раз.')
}

export const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

// Hidden field for bots: people never see or fill it
export const honeypotProps = {
  type: 'text',
  name: 'website',
  tabIndex: -1,
  autoComplete: 'off',
  'aria-hidden': true,
  style: { position: 'absolute', left: '-10000px', width: '1px', height: '1px', opacity: 0 },
}
