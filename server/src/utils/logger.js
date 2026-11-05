// One JSON line per event on stdout/stderr: the server's process manager
// (Docker or systemd) keeps and rotates the logs. Never log names, phones or
// anketa answers here: only lead ids and technical details.
function write(level, message, meta) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta })
  if (level === 'error' || level === 'warn' || level === 'security') console.error(line)
  else console.log(line)
}

const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  // Spam and abuse signals, easy to grep for
  security: (message, meta) => write('security', message, meta),
}

module.exports = { logger }
