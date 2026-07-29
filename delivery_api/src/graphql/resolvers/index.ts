import { adminResolvers } from './admin.js'
import { authResolvers } from './auth.js'
import { fieldResolvers } from './fields.js'
import { operationResolvers } from './operations.js'
import { queryResolvers } from './queries.js'
import { subscriptionResolvers } from './subscriptions.js'
import { executeMongooseQueries } from './executeQueries.js'
import { whatsappResolvers } from './whatsapp.js'

export const resolvers = executeMongooseQueries({
  ...fieldResolvers,
  WhatsAppConnection: whatsappResolvers.WhatsAppConnection,
  WhatsAppConversation: whatsappResolvers.WhatsAppConversation,
  WhatsAppMessage: whatsappResolvers.WhatsAppMessage,
  Query: {
    ...queryResolvers.Query,
    ...whatsappResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...operationResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...whatsappResolvers.Mutation
  },
  Subscription: {
    ...subscriptionResolvers.Subscription,
    ...whatsappResolvers.Subscription
  }
})
