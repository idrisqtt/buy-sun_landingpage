const { decodeDataUrl } = require('../utils/validation')

// Stores leads in the database (and anketa files on disk) before anything
// else, so a lead is never lost even if Bitrix24 or email are down.
function createLeadService({ prisma, storage }) {
  return {
    createShortLead(type, { name, phone, utm }) {
      return prisma.lead.create({
        data: { type, name: name || null, phone, utm: utm || undefined, consent_at: new Date() },
      })
    },

    async createAnketa({ answers, utm, files }) {
      // Decode and check every file first: a bad file rejects the whole anketa
      const decoded = Object.entries(files)
        .filter(([, value]) => value)
        .map(([kind, value]) => decodeDataUrl(kind, value))

      const { email, ...rest } = answers
      const lead = await prisma.lead.create({
        data: {
          type: 'anketa',
          name: `${answers.firstName} ${answers.lastName}`.trim(),
          phone: answers.phone,
          email: email || null,
          answers: { ...rest, email: email || '' },
          utm: utm || undefined,
          consent_at: new Date(),
        },
      })

      try {
        const saved = await storage.saveLeadFiles(lead.id, decoded)
        await prisma.leadFile.createMany({ data: saved.map((file) => ({ ...file, lead_id: lead.id })) })
      } catch (err) {
        await storage.removeLead(lead.id).catch(() => {})
        await prisma.lead.delete({ where: { id: lead.id } }).catch(() => {})
        throw err
      }
      return lead
    },
  }
}

module.exports = { createLeadService }
