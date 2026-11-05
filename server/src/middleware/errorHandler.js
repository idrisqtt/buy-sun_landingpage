const { logger } = require('../utils/logger')

// Answers in Russian for the site, never with internal details or user input
function errorHandler(err, req, res, _next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Проверьте заполнение формы',
      fields: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Файлы слишком большие' })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Неверный формат запроса' })
  }
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message })
  }
  logger.error('Request failed', { path: req.path, error: err.message, stack: err.stack })
  res.status(500).json({ error: 'Не удалось отправить. Попробуйте ещё раз или напишите нам в WhatsApp.' })
}

module.exports = { errorHandler }
