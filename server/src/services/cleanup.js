const { logger } = require('../utils/logger')

const DAY_MS = 24 * 60 * 60 * 1000

// Deletes leads (with their PDF and photos) older than the retention period
// the client chose. Personal data should not be kept longer than needed.
async function deleteOldLeads({ prisma, storage, retentionDays, now = new Date() }) {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS)
  const old = await prisma.lead.findMany({ where: { created_at: { lt: cutoff } }, select: { id: true } })
  for (const { id } of old) {
    await storage.removeLead(id)
    await prisma.lead.delete({ where: { id } })
  }
  if (old.length) logger.info('Old leads deleted', { count: old.length, retentionDays })
  return old.length
}

// Runs once shortly after start and then every day
function scheduleCleanup(deps) {
  if (!deps.retentionDays) return () => {}
  const run = () => deleteOldLeads(deps).catch((err) => logger.error('Cleanup failed', { error: err.message }))
  const first = setTimeout(run, 60 * 1000)
  const daily = setInterval(run, DAY_MS)
  first.unref()
  daily.unref()
  return () => { clearTimeout(first); clearInterval(daily) }
}

module.exports = { deleteOldLeads, scheduleCleanup }
