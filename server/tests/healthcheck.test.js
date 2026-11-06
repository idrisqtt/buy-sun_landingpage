const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { decideAlerts, rememberAlerts, sendAlert, checkBackup } = require('../scripts/healthcheck')

const HOUR = 3600 * 1000
const down = { name: 'site', ok: false, message: 'https://buysun.kz не открывается' }
const up = { name: 'site', ok: true }

describe('decideAlerts', () => {
  it('alerts once when a problem appears, not every 5 minutes', () => {
    const t0 = 1_000_000_000_000
    const first = decideAlerts({}, [down], t0)
    assert.equal(first.problems.length, 1)
    const second = decideAlerts(first.next, [down], t0 + 5 * 60 * 1000)
    assert.equal(second.problems.length, 0)
  })

  it('reminds after 12 hours while the problem stays, keeping when it started', () => {
    const t0 = 1_000_000_000_000
    const first = decideAlerts({}, [down], t0)
    const later = decideAlerts(first.next, [down], t0 + 12 * HOUR)
    assert.equal(later.problems.length, 1)
    assert.equal(later.problems[0].since, t0)
  })

  it('says when it is fixed, once', () => {
    const t0 = 1_000_000_000_000
    const first = decideAlerts({}, [down], t0)
    const fixed = decideAlerts(first.next, [up], t0 + HOUR)
    assert.deepEqual(fixed.resolved.map((r) => r.name), ['site'])
    assert.deepEqual(fixed.next, {})
    assert.equal(decideAlerts(fixed.next, [up], t0 + 2 * HOUR).resolved.length, 0)
  })
})

describe('rememberAlerts', () => {
  const t0 = 1_000_000_000_000

  it('sends a problem found before email worked as soon as email works', () => {
    const run1 = decideAlerts({}, [down], t0)
    const state1 = rememberAlerts({}, run1, false) // email not set up yet
    const run2 = decideAlerts(state1, [down], t0 + 5 * 60 * 1000)
    assert.equal(run2.problems.length, 1, 'not skipped for 12 hours')
    assert.equal(run2.problems[0].since, t0, 'keeps when it started')
    const state2 = rememberAlerts(state1, run2, true)
    assert.equal(decideAlerts(state2, [down], t0 + 10 * 60 * 1000).problems.length, 0, 'once sent, not repeated')
  })

  it('never says "fixed" about a problem the client did not hear about', () => {
    const run1 = decideAlerts({}, [down], t0)
    const state1 = rememberAlerts({}, run1, false)
    const run2 = decideAlerts(state1, [up], t0 + HOUR)
    assert.equal(run2.resolved.length, 0)
    assert.deepEqual(rememberAlerts(state1, run2, true), {})
  })

  it('tries the "fixed" email again if it could not be sent', () => {
    const state1 = rememberAlerts({}, decideAlerts({}, [down], t0), true)
    const run2 = decideAlerts(state1, [up], t0 + HOUR)
    const state2 = rememberAlerts(state1, run2, false) // mail server down
    assert.equal(decideAlerts(state2, [up], t0 + 2 * HOUR).resolved.length, 1)
  })
})

describe('sendAlert', () => {
  it('emails the problem and says whether it went out', async () => {
    const config = { mail: { transport: { jsonTransport: true }, from: 'site@buysun.kz', to: 'owner@buysun.kz' } }
    assert.equal(await sendAlert(config, 'https://buysun.kz', [{ ...down, since: Date.now() }], []), true)
    assert.equal(await sendAlert({ mail: null }, 'https://buysun.kz', [{ ...down, since: Date.now() }], []), false, 'email not set up')
  })
})

describe('checkBackup', () => {
  it('is fine with a fresh complete backup and complains about an old or missing one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buysun-bk-'))
    assert.equal(checkBackup(dir).ok, false)
    fs.mkdirSync(path.join(dir, '2026-11-05_033000'))
    assert.equal(checkBackup(dir).ok, false, 'a backup without checksums is unfinished')
    const sums = path.join(dir, '2026-11-05_033000', 'SHA256SUMS')
    fs.writeFileSync(sums, '')
    assert.equal(checkBackup(dir).ok, true)
    const old = new Date(Date.now() - 30 * HOUR)
    fs.utimesSync(sums, old, old)
    assert.match(checkBackup(dir).message, /30 ч назад/)
    fs.rmSync(dir, { recursive: true })
  })
})
