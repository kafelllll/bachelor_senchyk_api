type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

type LogEntry = {
  level: LogLevel;
  message: string;
  time: string;
  meta?: LogMeta;
};

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLevel = (): LogLevel => {
  const raw = (process.env.LOG_LEVEL || '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

const currentLevel = LEVELS[resolveLevel()];

const shouldLog = (level: LogLevel) => LEVELS[level] >= currentLevel;

const write = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  const writer = level === 'debug' ? console.log : console[level];
  writer(JSON.stringify(entry));
};

export const logger = {
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};
