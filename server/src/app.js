const express = require('express')
const helmet = require('helmet')
const { leadsRouter } = require('./routes/leads')
const { originCheck } = require('./middleware/spam')
const { errorHandler } = require('./middleware/errorHandler')
const { createLeadService } = require('./services/leads')

// The API only: the site itself is static files served by the web server
// in front (set up in the server branch), which forwards /api here.
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
  app.use('/api', originCheck(config.allowedOrigins), leadsRouter({ config, leads, delivery }))

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use(errorHandler)
  return app
}

module.exports = { createApp }
