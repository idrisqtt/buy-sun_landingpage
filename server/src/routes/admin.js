const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const auth = require('../services/auth')
const { logger } = require('../utils/logger')
const { anketaEditSchema, partnerTemplateSchema } = require('../utils/validation')

const COOKIE = 'bs_admin'
const PENDING_MS = 10 * 60 * 1000 // password checked, waiting for the phone code
const SESSION_MS = 12 * 60 * 60 * 1000 // a working day
const IDLE_MS = 2 * 60 * 60 * 1000 // logged out after 2 hours without activity
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

const fail = (status, message) => Object.assign(new Error(message), { status, expose: true })

function readCookie(req, name) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

// What the manager has to do before getting into the cabinet
function nextStep(user, session) {
  if (user.must_change_password) return 'password'
  if (!user.totp_enabled) return 'setup-2fa'
  if (!session.verified) return 'code'
  return null
}

function adminRouter({ config, prisma, storage, leadAdmin, templates }) {
  const router = express.Router()
  const strict = config.isProduction
  const json = express.json({ limit: '20kb' })

  const setCookie = (res, token, maxAgeMs) => {
    res.cookie(COOKIE, token, {
      httpOnly: true,
      secure: strict,
      sameSite: 'strict',
      path: '/api/admin',
      maxAge: maxAgeMs,
    })
  }

  // Never cache anything from the cabinet: it is personal data
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // A custom header cannot be sent by another site's form, so every change
  // must come from the cabinet's own scripts (on top of SameSite cookies)
  router.use((req, res, next) => {
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'buysun-admin') {
      logger.security('Cabinet request without the cabinet header', { path: req.path })
      return res.status(403).json({ error: 'Запрос отклонён' })
    }
    next()
  })

  const attemptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: strict ? 20 : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  })

  async function registerFailure(user, reason, req) {
    const attempts = user.failed_attempts + 1
    const locked = attempts >= MAX_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: { failed_attempts: locked ? 0 : attempts, locked_until: locked ? new Date(Date.now() + LOCK_MS) : undefined },
    })
    logger.security(locked ? 'Cabinet account locked for 15 minutes' : 'Cabinet login failed', { userId: user.id, reason, ip: req.ip })
  }

  const isLocked = (user) => user.locked_until && user.locked_until > new Date()

  // Finds the session from the cookie; refuses expired, idle or disabled ones
  async function loadSession(req, res, next) {
    try {
      const token = readCookie(req, COOKIE)
      if (!token) throw fail(401, 'Войдите в кабинет')
      const session = await prisma.session.findUnique({ where: { token_hash: auth.hashToken(token) }, include: { user: true } })
      const now = Date.now()
      if (!session || session.expires_at.getTime() < now || session.user.disabled
        || (session.verified && now - session.last_seen_at.getTime() > IDLE_MS)) {
        if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
        res.clearCookie(COOKIE, { path: '/api/admin' })
        throw fail(401, 'Сессия закончилась, войдите снова')
      }
      if (now - session.last_seen_at.getTime() > 60 * 1000) {
        await prisma.session.update({ where: { id: session.id }, data: { last_seen_at: new Date() } })
      }
      req.session = session
      req.user = session.user
      next()
    } catch (err) { next(err) }
  }

  const requireFull = (req, res, next) => {
    if (nextStep(req.user, req.session)) return next(fail(401, 'Войдите в кабинет'))
    next()
  }

  const me = (user, session) => ({ user: { name: user.name, email: user.email }, next: nextStep(user, session) })

  // ---- login ----

  router.post('/login', attemptLimiter, json, async (req, res, next) => {
    try {
      const { email, password } = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) }).parse(req.body)
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || user.disabled) {
        await auth.verifyAgainstDummy(password)
        logger.security('Cabinet login failed', { reason: 'unknown email', ip: req.ip })
        throw fail(401, 'Неверный email или пароль')
      }
      if (isLocked(user)) throw fail(423, 'Слишком много неудачных попыток. Попробуйте через 15 минут.')
      if (!(await auth.verifyPassword(password, user.password_hash))) {
        await registerFailure(user, 'password', req)
        throw fail(401, 'Неверный email или пароль')
      }
      const token = auth.newToken()
      const session = await prisma.session.create({
        data: { token_hash: auth.hashToken(token), user_id: user.id, expires_at: new Date(Date.now() + PENDING_MS) },
      })
      setCookie(res, token, PENDING_MS)
      res.json(me(user, session))
    } catch (err) { next(err) }
  })

  router.get('/me', loadSession, (req, res) => res.json(me(req.user, req.session)))

  router.post('/password', json, loadSession, async (req, res, next) => {
    try {
      const { password } = z.object({
        password: z.string().min(10, 'Пароль должен быть не короче 10 символов').max(200),
      }).parse(req.body)
      if (req.session.verified === false && !req.user.must_change_password) throw fail(401, 'Войдите в кабинет')
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { password_hash: await auth.hashPassword(password), must_change_password: false },
      })
      // Other devices are logged out after a password change
      await prisma.session.deleteMany({ where: { user_id: user.id, id: { not: req.session.id } } })
      logger.info('Cabinet password changed', { userId: user.id })
      res.json(me(user, req.session))
    } catch (err) { next(err) }
  })

  router.post('/2fa/setup', loadSession, async (req, res, next) => {
    try {
      if (req.user.must_change_password || req.user.totp_enabled) throw fail(400, 'Код с телефона уже подключён')
      const secret = auth.newTotpSecret()
      await prisma.user.update({ where: { id: req.user.id }, data: { totp_secret: secret } })
      res.json(await auth.totpSetupData(secret, req.user.email))
    } catch (err) { next(err) }
  })

  // Confirms the phone app on first setup, or checks the code on every login
  router.post(['/2fa/confirm', '/code'], attemptLimiter, json, loadSession, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().max(20) }).parse(req.body)
      const user = req.user
      const setup = req.path === '/2fa/confirm'
      if (user.must_change_password || !user.totp_secret || (setup ? user.totp_enabled : !user.totp_enabled)) {
        throw fail(400, 'Сначала выполните предыдущий шаг')
      }
      if (isLocked(user)) throw fail(423, 'Слишком много неудачных попыток. Попробуйте через 15 минут.')
      const step = auth.checkTotp(user.totp_secret, user.email, code, user.totp_last_step)
      if (step === null) {
        await registerFailure(user, 'code', req)
        throw fail(401, 'Неверный код. Введите новый код из приложения.')
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { totp_enabled: true, totp_last_step: step, failed_attempts: 0, locked_until: null, last_login_at: new Date() },
      })
      // A new cookie value after login, so a value seen before login is useless
      const token = auth.newToken()
      const session = await prisma.session.update({
        where: { id: req.session.id },
        data: { token_hash: auth.hashToken(token), verified: true, expires_at: new Date(Date.now() + SESSION_MS), last_seen_at: new Date() },
      })
      setCookie(res, token, SESSION_MS)
      logger.info('Cabinet login', { userId: user.id })
      res.json(me(updated, session))
    } catch (err) { next(err) }
  })

  router.post('/logout', async (req, res, next) => {
    try {
      const token = readCookie(req, COOKIE)
      if (token) await prisma.session.deleteMany({ where: { token_hash: auth.hashToken(token) } })
      res.clearCookie(COOKIE, { path: '/api/admin' })
      res.json({ ok: true })
    } catch (err) { next(err) }
  })

  // ---- leads ----

  router.get('/leads', loadSession, requireFull, async (req, res, next) => {
    try {
      const query = z.object({
        q: z.string().trim().max(100).optional(),
        type: z.enum(['quick', 'callback', 'anketa']).optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      }).parse(req.query)
      res.json(await leadAdmin.list(query))
    } catch (err) { next(err) }
  })

  const leadId = (req) => z.coerce.number().int().positive().parse(req.params.id)

  router.get('/leads/:id', loadSession, requireFull, async (req, res, next) => {
    try {
      const lead = await leadAdmin.get(leadId(req))
      if (!lead) throw fail(404, 'Заявка не найдена')
      res.json(lead)
    } catch (err) { next(err) }
  })

  router.get('/leads/:id/files/:fileId', loadSession, requireFull, async (req, res, next) => {
    try {
      const file = await prisma.leadFile.findFirst({
        where: { id: z.coerce.number().int().positive().parse(req.params.fileId), lead_id: leadId(req) },
      })
      if (!file) throw fail(404, 'Файл не найден')
      const buffer = await storage.read(file.path)
      res.set('Content-Type', file.mime)
      res.set('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${file.kind}-${file.lead_id}${file.mime === 'application/pdf' ? '.pdf' : '.jpg'}"`)
      res.send(buffer)
    } catch (err) { next(err) }
  })

  // PDF up to 8 MB and three photos up to 4 MB each, base64 adds a third
  router.put('/leads/:id', express.json({ limit: '28mb' }), loadSession, requireFull, async (req, res, next) => {
    try {
      const data = anketaEditSchema.parse(req.body)
      const lead = await leadAdmin.update(leadId(req), data, req.user)
      res.json(lead)
    } catch (err) { next(err) }
  })

  // ---- the partner template ----

  router.get('/template', loadSession, requireFull, async (req, res, next) => {
    try {
      res.json({ template: await templates.get() })
    } catch (err) { next(err) }
  })

  router.put('/template', express.json({ limit: '2mb' }), loadSession, requireFull, async (req, res, next) => {
    try {
      const template = await templates.save(partnerTemplateSchema.parse(req.body), req.user)
      logger.info('Partner template saved', { userId: req.user.id })
      res.json({ template })
    } catch (err) { next(err) }
  })

  router.delete('/template', loadSession, requireFull, async (req, res, next) => {
    try {
      await templates.remove()
      logger.info('Partner template removed', { userId: req.user.id })
      res.json({ template: null })
    } catch (err) { next(err) }
  })

  return router
}

module.exports = { adminRouter }
