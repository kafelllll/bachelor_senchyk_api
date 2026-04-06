const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLevel = () => {
  const raw = String(process.env.LOG_LEVEL || '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

const currentLevel = LEVELS[resolveLevel()];

const shouldLog = (level) => LEVELS[level] >= currentLevel;

const write = (level, message, meta) => {
  if (!shouldLog(level)) return;
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  const writer = level === 'debug' ? console.log : console[level];
  writer(JSON.stringify(entry));
};

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

module.exports = { logger };
