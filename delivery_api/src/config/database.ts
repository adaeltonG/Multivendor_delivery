import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

mongoose.set('strictQuery', true)
mongoose.set('sanitizeFilter', true)

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
    autoIndex: env.NODE_ENV !== 'production',
    maxPoolSize: 20,
    minPoolSize: env.NODE_ENV === 'production' ? 2 : 0,
    serverSelectionTimeoutMS: 10_000
  })
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected')
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}
