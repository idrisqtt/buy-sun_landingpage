const express = require('express')
const rateLimit = require('express-rate-limit')
const { honeypot } = require('../middleware/spam')
const { quickLeadSchema, callbackLeadSchema, anketaSchema } = require('../utils/validation')
const { logger } = require('../utils/logger')

// Anketas are taken a few at a time: each one is several megabytes in memory
// while it is checked and written to disk. The others wait their turn (their
// upload simply pauses), so a burst cannot run the server out of memory.
function oneAtATime(max) {
  let active = 0
  const waiting = []
  const release = () => {
    active--
    const next = waiting.shift()
    if (next) next()
  }
  return (req, res, next) => {
    const start = () => {
      active++
      let released = false
      const done = () => { if (!released) { released = true; release() } }
      res.on('finish', done)
      res.on('close', done)
      next()
    }
    if (active < max) start()
    else waiting.push(start)
  }
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
  const anketaTurn = oneAtATime(3)

  router.post('/leads/quick', limiter(10), smallJson, honeypot, async (req, res, next) => {
    try {
      const data = quickLeadSchema.parse(req.body)
      const lead = await leads.createShortLead('quick', data)
      logger.info('Lead stored', { leadId: lead.id, type: 'quick' })
      res.status(201).json({ ok: true })
      delivery.enqueue(lead.id) // Bitrix24 and email in the background
    } catch (err) { next(err) }
  })

  router.post('/leads/callback', limiter(10), smallJson, honeypot, async (req, res, next) => {
    try {
      const data = callbackLeadSchema.parse(req.body)
      const lead = await leads.createShortLead('callback', data)
      logger.info('Lead stored', { leadId: lead.id, type: 'callback' })
      res.status(201).json({ ok: true })
      delivery.enqueue(lead.id) // Bitrix24 and email in the background
    } catch (err) { next(err) }
  })

  router.post('/leads/anketa', limiter(10), anketaTurn, anketaJson, honeypot, async (req, res, next) => {
    try {
      const data = anketaSchema.parse(req.body)
      const lead = await leads.createAnketa(data)
      logger.info('Lead stored', { leadId: lead.id, type: 'anketa' })
      res.status(201).json({ ok: true })
      delivery.enqueue(lead.id) // Bitrix24 and email in the background
    } catch (err) { next(err) }
  })

  return router
}

module.exports = { leadsRouter }
