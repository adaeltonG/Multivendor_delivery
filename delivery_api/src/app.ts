import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { expressMiddleware } from '@as-integrations/express5'
import { makeExecutableSchema } from '@graphql-tools/schema'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { createServer, type Server } from 'node:http'
import { pinoHttp } from 'pino-http'
import { execute, subscribe } from 'graphql'
import { useServer } from 'graphql-ws/use/ws'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { WebSocketServer } from 'ws'
import { allowedOrigins, env } from './config/env.js'
import { logger } from './config/logger.js'
import { contextFromAuthorization, type GraphQLContext } from './graphql/context.js'
import { resolvers } from './graphql/resolvers/index.js'
import { typeDefs } from './graphql/typeDefs.js'
import { whatsappRouter } from './routes/whatsapp.js'

export type AppServer = {
  httpServer: Server
  apolloServer: ApolloServer<GraphQLContext>
}

function corsOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    callback(null, true)
    return
  }
  callback(new Error('Origin is not allowed by CORS'))
}

export async function createAppServer(): Promise<AppServer> {
  const app = express()
  const httpServer = createServer(app)
  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const modernWs = new WebSocketServer({ noServer: true })
  const legacyWs = new WebSocketServer({ noServer: true })

  const modernCleanup = useServer(
    {
      schema,
      context: async connectionContext => {
        const params = connectionContext.connectionParams ?? {}
        const authorization =
          (params.authorization as string | undefined) ??
          (params.Authorization as string | undefined)
        return contextFromAuthorization(authorization)
      }
    },
    modernWs as never
  )

  const legacyServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect(connectionParams: Record<string, unknown>) {
        const authorization =
          (connectionParams.authorization as string | undefined) ??
          (connectionParams.Authorization as string | undefined)
        return contextFromAuthorization(authorization)
      }
    },
    legacyWs
  )

  httpServer.on('upgrade', (request, socket, head) => {
    const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname
    if (requestPath !== env.GRAPHQL_PATH) {
      socket.destroy()
      return
    }
    const protocols = String(request.headers['sec-websocket-protocol'] ?? '')
      .split(',')
      .map(value => value.trim())
    const target = protocols.includes('graphql-transport-ws') ? modernWs : legacyWs
    target.handleUpgrade(request, socket, head, ws => target.emit('connection', ws, request))
  })

  const apolloServer = new ApolloServer<GraphQLContext>({
    schema,
    csrfPrevention: true,
    introspection: env.NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: env.NODE_ENV !== 'production',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await modernCleanup.dispose()
              legacyServer.close()
              modernWs.close()
              legacyWs.close()
            }
          }
        }
      },
      ...(env.NODE_ENV === 'development'
        ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        : [])
    ],
    formatError(formattedError) {
      if (env.NODE_ENV === 'production') {
        delete formattedError.extensions?.stacktrace
      }
      return formattedError
    }
  })
  await apolloServer.start()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(pinoHttp({ logger }))
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false
    })
  )
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'enatega-delivery-api' })
  })
  app.get('/', (_req, res) => {
    res.json({
      service: 'enatega-delivery-api',
      graphql: env.GRAPHQL_PATH,
      health: '/health'
    })
  })
  app.use(
    '/webhooks/whatsapp',
    express.json({
      limit: '256kb',
      verify: (req, _res, buffer) => {
        ;(req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
      }
    }),
    whatsappRouter
  )
  app.use(
    env.GRAPHQL_PATH,
    rateLimit({
      windowMs: 60_000,
      limit: env.NODE_ENV === 'production' ? 300 : 2000,
      standardHeaders: 'draft-8',
      legacyHeaders: false
    }),
    cors({ origin: corsOrigin, credentials: true }),
    express.json({ limit: '1mb' }),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => ({
        ...contextFromAuthorization(req.headers.authorization),
        req,
        res
      })
    })
  )
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' })
  })
  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error({ error }, 'Unhandled Express error')
      res.status(500).json({ error: 'Internal server error' })
    }
  )

  return { httpServer, apolloServer }
}
