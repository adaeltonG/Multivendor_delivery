import { createAppServer } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

async function start() {
  await connectDatabase()
  const { httpServer, apolloServer } = await createAppServer()

  await new Promise<void>(resolve => {
    httpServer.listen(env.PORT, '0.0.0.0', resolve)
  })
  logger.info(
    {
      http: `http://localhost:${env.PORT}${env.GRAPHQL_PATH}`,
      websocket: `ws://localhost:${env.PORT}${env.GRAPHQL_PATH}`
    },
    'Enatega API started'
  )

  let stopping = false
  const stop = async (signal: string) => {
    if (stopping) return
    stopping = true
    logger.info({ signal }, 'Shutting down')
    await apolloServer.stop()
    await disconnectDatabase()
    process.exit(0)
  }

  process.once('SIGINT', () => void stop('SIGINT'))
  process.once('SIGTERM', () => void stop('SIGTERM'))
}

start().catch(error => {
  logger.fatal({ error }, 'Failed to start API')
  process.exit(1)
})
