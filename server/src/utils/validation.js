const { z } = require('zod')
const { ANKETA_KEYS, BOOLEAN_FIELDS } = require('./anketaFields')

// Brings Kazakhstan numbers to +7XXXXXXXXXX so Bitrix24 can find duplicates;
// other countries keep their digits with a leading +. Returns null if the
// value cannot be a phone number.
function normalizePhone(raw) {
  if (typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`
  if (digits.length === 10 && digits[0] === '7') return `+7${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

const phone = z.string().max(40).transform((value, ctx) => {
  const normalized = normalizePhone(value)
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'Неверный номер телефона' })
    return z.NEVER
  }
  return normalized
})

const text = (max) => z.string().trim().max(max)

const utm = z.object({
  utm_source: text(200).optional(),
  utm_medium: text(200).optional(),
  utm_campaign: text(200).optional(),
  utm_content: text(200).optional(),
  utm_term: text(200).optional(),
}).optional()

// Hidden "website" field: people never see it, bots fill it in.
const honeypot = z.string().max(500).optional()

const quickLeadSchema = z.object({
  name: text(100).min(1, 'Укажите имя'),
  phone,
  consent: z.literal(true, { message: 'Нужно согласие на обработку данных' }),
  utm,
  website: honeypot,
})

const callbackLeadSchema = z.object({
  phone,
  consent: z.literal(true, { message: 'Нужно согласие на обработку данных' }),
  utm,
  website: honeypot,
})

const answersShape = Object.fromEntries(ANKETA_KEYS.map((key) => [
  key,
  BOOLEAN_FIELDS.has(key) ? z.boolean().optional() : text(key === 'hobbies' || key === 'courses' ? 2000 : 300).optional(),
]))

const answers = z.object(answersShape).extend({
  firstName: text(100).min(1, 'Укажите имя'),
  lastName: text(100).min(1, 'Укажите фамилию'),
  phone,
  email: z.union([z.literal(''), z.email().max(200)]).optional(),
})

const MB = 1024 * 1024
const FILE_RULES = {
  pdf: { mime: 'application/pdf', maxBytes: 8 * MB },
  selfie: { mime: 'image/jpeg', maxBytes: 4 * MB },
  full_body: { mime: 'image/jpeg', maxBytes: 4 * MB },
  additional: { mime: 'image/jpeg', maxBytes: 4 * MB },
  // A partner's logo; the cabinet always converts it to PNG to keep transparency
  logo: { mime: 'image/png', maxBytes: 1 * MB },
}

const dataUrl = (kind) => z.string().max(Math.ceil(FILE_RULES[kind].maxBytes * 4 / 3) + 100).optional()

// Where the face is on the selfie, for the round crop in the PDF
const focus = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional()

const anketaFiles = z.object({
  pdf: dataUrl('pdf').pipe(z.string({ message: 'Нет PDF анкеты' })),
  selfie: dataUrl('selfie'),
  full_body: dataUrl('full_body'),
  additional: dataUrl('additional'),
})

const anketaSchema = z.object({
  answers,
  selfieFocus: focus,
  consent: z.literal(true, { message: 'Нужно согласие на обработку данных' }),
  utm,
  website: honeypot,
  files: anketaFiles,
})

// A manager saving an anketa in the cabinet: the new PDF always, photos only
// the ones that were replaced
const anketaEditSchema = z.object({
  answers,
  selfieFocus: focus,
  files: anketaFiles,
})

// The partner template: what replaces the BUY SUN logo at the top of the PDF.
// logo: a PNG data URL, null to remove it, left out to keep the saved one.
const lines = (max, maxLines) => z.string().trim().max(max)
  .refine((v) => v.split('\n').length <= maxLines, { message: `Не больше ${maxLines} строк` })
const partnerTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название партнёра').max(80),
  header: lines(120, 2),
  contacts: lines(300, 3),
  logo: z.union([dataUrl('logo'), z.null()]),
})

const SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
}

// Turns "data:<mime>;base64,..." into a Buffer after checking the declared type,
// the real file signature and the size. Throws a 400 error otherwise.
function decodeDataUrl(kind, value) {
  const rule = FILE_RULES[kind]
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value)
  const fail = (message) => Object.assign(new Error(message), { status: 400, expose: true })
  if (!match || match[1] !== rule.mime) throw fail(`Файл ${kind}: неверный формат`)
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0 || buffer.length > rule.maxBytes) throw fail(`Файл ${kind}: неверный размер`)
  const signature = SIGNATURES[rule.mime]
  if (!signature.every((byte, i) => buffer[i] === byte)) throw fail(`Файл ${kind}: содержимое не совпадает с форматом`)
  return { kind, mime: rule.mime, buffer }
}

module.exports = {
  normalizePhone,
  quickLeadSchema,
  callbackLeadSchema,
  anketaSchema,
  anketaEditSchema,
  partnerTemplateSchema,
  decodeDataUrl,
  FILE_RULES,
}
