const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

const EXTENSIONS = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg' }

// Anketa PDFs and photos on the server disk: UPLOAD_DIR/leads/<lead id>/.
// Files are readable only by the server user; random names so a path can
// never be guessed even if the folder were ever exposed by mistake.
function createStorage(rootDir) {
  const leadDir = (leadId) => path.join(rootDir, 'leads', String(leadId))

  const resolveInside = (relPath) => {
    const full = path.resolve(rootDir, relPath)
    if (!full.startsWith(path.resolve(rootDir) + path.sep)) throw new Error('Path outside upload dir')
    return full
  }

  return {
    rootDir,

    async saveLeadFiles(leadId, files) {
      const dir = leadDir(leadId)
      await fs.mkdir(dir, { recursive: true, mode: 0o700 })
      const saved = []
      for (const file of files) {
        const name = `${file.kind}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[file.mime]}`
        await fs.writeFile(path.join(dir, name), file.buffer, { mode: 0o600, flag: 'wx' })
        saved.push({
          kind: file.kind,
          path: path.relative(rootDir, path.join(dir, name)),
          mime: file.mime,
          size: file.buffer.length,
        })
      }
      return saved
    },

    read(relPath) {
      return fs.readFile(resolveInside(relPath))
    },

    async removeLead(leadId) {
      await fs.rm(leadDir(leadId), { recursive: true, force: true })
    },
  }
}

module.exports = { createStorage }
