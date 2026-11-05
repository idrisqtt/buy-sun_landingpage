const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

function createPrisma(databaseUrl) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
}

module.exports = { createPrisma }
