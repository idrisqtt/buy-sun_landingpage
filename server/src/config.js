const path = require('path')
const { z } = require('zod')

const emptyToUndefined = (value) => (value === '' ? undefined : value)
const optionalString = z.preprocess(emptyToUndefined, z.string().optional())
const optionalInt = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  // 127.0.0.1: only the web server on the same machine can reach the API.
  // In a container set 0.0.0.0 and publish the port to 127.0.0.1 only.
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  UPLOAD_DIR: z.string().default('./uploads'),
  FRONTEND_URL: optionalString,
  BITRIX_WEBHOOK_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  BITRIX_ASSIGNED_BY_ID: optionalInt,
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('false')),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: optionalString,
  LEADS_EMAIL_TO: optionalString,
  RETENTION_DAYS: optionalInt,
})

// Reads and checks the environment once at start, so a typo in .env stops the
// server with a clear message instead of failing on the first lead.
function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid configuration: ${problems}`)
  }
  const e = parsed.data
  const isProduction = e.NODE_ENV === 'production'
  const allowedOrigins = (e.FRONTEND_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('Invalid configuration: FRONTEND_URL is required in production')
  }

  return {
    env: e.NODE_ENV,
    isProduction,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    uploadDir: path.resolve(e.UPLOAD_DIR),
    allowedOrigins: isProduction
      ? allowedOrigins
      : [...allowedOrigins, 'http://localhost:5173', 'http://localhost:4173'],
    // Public address of the site, for links to the cabinet in Bitrix24
    siteUrl: allowedOrigins[0] || 'http://localhost:5173',
    bitrix: e.BITRIX_WEBHOOK_URL
      ? {
          webhookUrl: e.BITRIX_WEBHOOK_URL.replace(/\/$/, ''),
          assignedById: e.BITRIX_ASSIGNED_BY_ID,
          cabinetUrl: (leadId) => `${allowedOrigins[0] || 'http://localhost:5173'}/admin/#/leads/${leadId}`,
        }
      : null,
    mail: e.SMTP_HOST && e.LEADS_EMAIL_TO
      ? {
          transport: {
            host: e.SMTP_HOST,
            port: e.SMTP_PORT,
            secure: e.SMTP_SECURE === 'true',
            auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
          },
          from: e.MAIL_FROM || e.SMTP_USER,
          to: e.LEADS_EMAIL_TO,
        }
      : null,
    retentionDays: e.RETENTION_DAYS ?? null,
  }
}

module.exports = { loadConfig }
