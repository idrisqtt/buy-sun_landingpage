const { logger } = require('../utils/logger')

// Hidden "website" field: people never see it, bots fill it in. The bot gets
// the same answer as a person, so it does not learn it was caught.
function honeypot(req, res, next) {
  if (typeof req.body?.website === 'string' && req.body.website.length > 0) {
    logger.security('Spam caught by honeypot', { path: req.path })
    return res.status(201).json({ ok: true })
  }
  next()
}

// Browsers always send Origin with form requests. A request from another
// site's page is refused; requests without Origin are let through to the
// other checks, so no real candidate is ever blocked by an odd browser.
function originCheck(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.headers.origin
    if (origin && !allowedOrigins.includes(origin)) {
      logger.security('Form sent from a foreign origin', { path: req.path, origin })
      return res.status(403).json({ error: 'Запрос отклонён' })
    }
    next()
  }
}

module.exports = { honeypot, originCheck }
