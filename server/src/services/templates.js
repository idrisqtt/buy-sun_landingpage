const { decodeDataUrl } = require('../utils/validation')

const fail = (status, message) => Object.assign(new Error(message), { status, expose: true })

// The partner template: logo, header and contacts that replace BUY SUN at the
// top of the PDF. The base package keeps one, shared by all managers; saving
// again replaces it. Kept in the database, so it is in the nightly backup.
function createTemplates({ prisma }) {
  const view = (t) => t && {
    name: t.name,
    header: t.header,
    contacts: t.contacts,
    logo: t.logo ? `data:image/png;base64,${Buffer.from(t.logo).toString('base64')}` : null,
    updated_at: t.updated_at,
    updated_by: t.user?.name || null,
  }

  const current = () => prisma.partnerTemplate.findFirst({ orderBy: { id: 'desc' }, include: { user: true } })

  return {
    async get() {
      return view(await current())
    },

    // data.logo: a PNG data URL, null to remove, undefined to keep the saved one
    async save(data, user) {
      const saved = await current()
      let logo = saved?.logo ?? null
      if (data.logo === null) logo = null
      else if (data.logo !== undefined) logo = decodeDataUrl('logo', data.logo).buffer
      if (!data.header && !data.contacts && !logo) throw fail(400, 'Добавьте логотип, шапку или контакты')

      const fields = { name: data.name, header: data.header, contacts: data.contacts, logo, updated_by: user.id }
      const template = saved
        ? await prisma.partnerTemplate.update({ where: { id: saved.id }, data: fields, include: { user: true } })
        : await prisma.partnerTemplate.create({ data: fields, include: { user: true } })
      return view(template)
    },

    async remove() {
      await prisma.partnerTemplate.deleteMany({})
    },
  }
}

module.exports = { createTemplates }
