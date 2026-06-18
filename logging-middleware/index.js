const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'app.log');

function writeLog(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(logFile, line, (err) => {
  });
}

function createLogger(name) {
  function format(level, message, meta) {
    const entry = {
      ts: new Date().toISOString(),
      service: name,
      level,
      message,
      meta: meta || {},
    };
    writeLog(entry);
    return entry;
  }

  return {
    info: (msg, meta) => format('info', msg, meta),
    warn: (msg, meta) => format('warn', msg, meta),
    error: (msg, meta) => format('error', msg, meta),
    debug: (msg, meta) => format('debug', msg, meta),
  };
}

function expressMiddleware(logger) {
  return function (req, res, next) {
    const start = Date.now();
    logger.info('req:start', { method: req.method, url: req.originalUrl });
    res.on('finish', () => {
      const elapsed = Date.now() - start;
      logger.info('req:finish', { method: req.method, url: req.originalUrl, status: res.statusCode, elapsed });
    });
    next();
  };
}

module.exports = { createLogger, expressMiddleware };
