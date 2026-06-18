const STORAGE_KEY = 'notification-app-logs';

function readLogs() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-200)));
}

export function createLogger(service) {
  function log(level, message, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      service,
      level,
      message,
      meta,
    };

    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);

    return entry;
  }

  return {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    debug: (message, meta) => log('debug', message, meta),
  };
}
