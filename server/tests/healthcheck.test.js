const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { decideAlerts, checkBackup } = require('../scripts/healthcheck')

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
