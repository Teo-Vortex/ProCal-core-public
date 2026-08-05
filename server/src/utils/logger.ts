import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-procal-sync-token']",
      "req.headers['x-procal-backup-key-base64']",
      "req.headers['x-control-public-token']",
      "req.body.serviceAccount",
      "req.body.googleServices",
      "res.headers['set-cookie']"
    ],
    censor: "[REDACTED]"
  }
});

