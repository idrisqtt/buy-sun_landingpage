require('dotenv/config')

const { loadConfig } = require('./config')
const { createApp } = require('./app')
const { createPrisma } = require('./services/prisma')
const { createStorage } = require('./services/storage')
const { createBitrix } = require('./services/bitrix')
const { createMailer } = require('./services/mailer')
const { createDelivery } = require('./services/delivery')
const { scheduleCleanup } = require('./services/cleanup')
const { logger } = require('./utils/logger')

let config
try {
  config = loadConfig()
} catch (err) {
  console.error(`FATAL: ${err.message}`)
  process.exit(1)
}

const prisma = createPrisma(config.databaseUrl)
const storage = createStorage(config.uploadDir)
const bitrix = config.bitrix ? createBitrix(config.bitrix) : null
const mailer = config.mail ? createMailer(config.mail) : null
if (!bitrix) logger.warn('BITRIX_WEBHOOK_URL is not set: leads will not go to Bitrix24')
if (!mailer) logger.warn('SMTP_HOST or LEADS_EMAIL_TO is not set: no email copies of leads')

const delivery = createDelivery({ prisma, storage, bitrix, mailer })
const app = createApp({ config, prisma, storage, delivery })
const stopCleanup = scheduleCleanup({ prisma, storage, retentionDays: config.retentionDays })

const server = app.listen(config.port, config.host, () => {
  logger.info('BUY SUN API started', { host: config.host, port: config.port, env: config.env })
  delivery.resumePending().catch((err) => logger.error('Could not resume deliveries', { error: err.message }))
})

async function shutdown(signal) {
  logger.info('Shutting down', { signal })
  stopCleanup()
  server.close(async () => {
    // Let the lead being sent finish; the rest stays pending for the next start
    await Promise.race([delivery.idle(), new Promise((r) => setTimeout(r, 8000))])
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
