import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'authorization',
      'password',
      '*.password',
      'JWT_SECRET',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_APP_SECRET',
      '*.accessToken'
    ],
    censor: '[REDACTED]'
  }
})
