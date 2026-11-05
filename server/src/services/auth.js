const crypto = require('crypto')
const { promisify } = require('util')
const { TOTP, Secret } = require('otpauth')
const QRCode = require('qrcode')

const scrypt = promisify(crypto.scrypt)

// ---- passwords: scrypt from Node itself, no native modules to build ----

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 32

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, KEY_LENGTH, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, key] = String(stored).split('$')
  if (scheme !== 'scrypt') return false
  const expected = Buffer.from(key, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  })
  return crypto.timingSafeEqual(actual, expected)
}

// Hash of a password nobody has: checked when the email is unknown, so the
// answer takes the same time and does not reveal which emails exist
let dummyHash = null
async function verifyAgainstDummy(password) {
  dummyHash = dummyHash || await hashPassword(crypto.randomBytes(16).toString('hex'))
  await verifyPassword(password, dummyHash)
  return false
}

function generatePassword() {
  // 14 characters without look-alikes (0/O, 1/l/I), easy to type from a message
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(14), (b) => alphabet[b % alphabet.length]).join('')
}

// ---- session tokens: random value in the cookie, only its hash in the database ----

const newToken = () => crypto.randomBytes(32).toString('base64url')
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

// ---- codes from the phone (Google Authenticator and alike) ----

const totpFor = (secretBase32, email) => new TOTP({
  issuer: 'BUY SUN',
  label: email,
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: Secret.fromBase32(secretBase32),
})

function newTotpSecret() {
  return new Secret({ size: 20 }).base32
}

async function totpSetupData(secretBase32, email) {
  const uri = totpFor(secretBase32, email).toString()
  return { uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret: secretBase32 }
}

// Returns the time step of an accepted code, or null. A code is accepted for
// the current 30 seconds and one step either side (phone clock drift), and
// never twice: steps up to lastStep are refused.
function checkTotp(secretBase32, email, code, lastStep, now = Date.now()) {
  const token = String(code || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(token)) return null
  const delta = totpFor(secretBase32, email).validate({ token, window: 1, timestamp: now })
  if (delta === null) return null
  const step = Math.floor(now / 1000 / 30) + delta
  if (lastStep != null && step <= lastStep) return null
  return step
}

module.exports = {
  hashPassword, verifyPassword, verifyAgainstDummy, generatePassword,
  newToken, hashToken, newTotpSecret, totpSetupData, checkTotp, totpFor,
}
