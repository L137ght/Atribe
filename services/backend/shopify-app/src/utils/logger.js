import { env } from "../config/env.js";

const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const currentLevel = levels[env.logLevel] || levels.debug;

const shouldLog = (level) => (levels[level] || levels.info) >= currentLevel;

const writeLog = (level, message, meta = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString()
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug(message, meta) {
    writeLog("debug", message, meta);
  },
  info(message, meta) {
    writeLog("info", message, meta);
  },
  warn(message, meta) {
    writeLog("warn", message, meta);
  },
  error(message, meta) {
    writeLog("error", message, meta);
  }
};
