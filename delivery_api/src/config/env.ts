import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8001),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('*'),
  GRAPHQL_PATH: z.string().startsWith('/').default('/graphql'),
  WHATSAPP_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform(value => value === 'true'),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default(''),
  WHATSAPP_APP_SECRET: z.string().default(''),
  WHATSAPP_TOKEN_ENCRYPTION_KEY: z.string().default(''),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v25.0'),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en_GB'),
  WHATSAPP_ORDER_CREATED_TEMPLATE: z.string().default('zetahub_new_order'),
  WHATSAPP_ORDER_STATUS_TEMPLATE: z.string().default('zetahub_order_status'),
  WHATSAPP_RIDER_ASSIGNED_TEMPLATE: z.string().default('zetahub_rider_assigned'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.CORS_ORIGINS === '*') {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'CORS_ORIGINS must be an explicit allowlist in production'
    })
  }
  if (value.WHATSAPP_ENABLED) {
    for (const key of [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_VERIFY_TOKEN',
      'WHATSAPP_APP_SECRET'
    ] as const) {
      if (!value[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when WHATSAPP_ENABLED=true`
        })
      }
    }
  }
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration', z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
export const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
