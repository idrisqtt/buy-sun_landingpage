const express = require('express')
const rateLimit = require('express-rate-limit')
const { honeypot } = require('../middleware/spam')
const { quickLeadSchema, callbackLeadSchema, anketaSchema } = require('../utils/validation')
const { logger } = require('../utils/logger')

// Answer the person right away; Bitrix24 and email are sent in the background
function afterResponse(delivery, leadId) {
  setImmediate(() => {
    delivery.deliver(leadId).catch((err) => logger.error('Delivery crashed', { leadId, error: err.message }))
  })
}

function leadsRouter({ config, leads, delivery }) {
  const router = express.Router()
  const strict = config.isProduction

  const limiter = (max) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: strict ? max : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Слишком много заявок. Попробуйте через 15 минут.' },
  })

  const smallJson = express.json({ limit: '20kb' })
  // PDF up to 8 MB and three photos up to 4 MB each, base64 adds a third
  const anketaJson = express.json({ limit: '28mb' })

  router.post('/leads/quick', limiter(10), smallJson, honeypot, async (req, res, next) => {
    try {
      const data = quickLeadSchema.parse(req.body)
      const lead = await leads.createShortLead('quick', data)
      logger.info('Lead stored', { leadId: lead.id, type: 'quick' })
      res.status(201).json({ ok: true })
      afterResponse(delivery, lead.id)
    } catch (err) { next(err) }
  })

  router.post('/leads/callback', limiter(10), smallJson, honeypot, async (req, res, next) => {
    try {
      const data = callbackLeadSchema.parse(req.body)
      const lead = await leads.createShortLead('callback', data)
      logger.info('Lead stored', { leadId: lead.id, type: 'callback' })
      res.status(201).json({ ok: true })
      afterResponse(delivery, lead.id)
    } catch (err) { next(err) }
  })

  router.post('/leads/anketa', limiter(10), anketaJson, honeypot, async (req, res, next) => {
    try {
      const data = anketaSchema.parse(req.body)
      const lead = await leads.createAnketa(data)
      logger.info('Lead stored', { leadId: lead.id, type: 'anketa' })
      res.status(201).json({ ok: true })
      afterResponse(delivery, lead.id)
    } catch (err) { next(err) }
  })

  return router
}

module.exports = { leadsRouter }
