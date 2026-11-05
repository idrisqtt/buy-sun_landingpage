const express = require('express')
const helmet = require('helmet')
const { leadsRouter } = require('./routes/leads')
const { adminRouter } = require('./routes/admin')
const { createLeadAdmin } = require('./services/leadAdmin')
const { createTemplates } = require('./services/templates')
const { originCheck } = require('./middleware/spam')
const { errorHandler } = require('./middleware/errorHandler')
const { createLeadService } = require('./services/leads')

// The API only: the site and the cabinet page are static files served by
// the web server in front, which forwards /api here.
function createApp({ config, prisma, storage, delivery }) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // real client IP for rate limits behind the web server
  app.use(helmet())

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ status: 'db_unavailable' })
    }
  })

  const leads = createLeadService({ prisma, storage })
  const bitrixPortal = config.bitrix ? new URL(config.bitrix.webhookUrl).origin : null
  const leadAdmin = createLeadAdmin({ prisma, storage, bitrixPortal })
  app.use('/api', originCheck(config.allowedOrigins))
  app.use('/api/admin', adminRouter({ config, prisma, storage, leadAdmin, templates: createTemplates({ prisma }) }))
  app.use('/api', leadsRouter({ config, leads, delivery }))

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use(errorHandler)
  return app
}

module.exports = { createApp }
