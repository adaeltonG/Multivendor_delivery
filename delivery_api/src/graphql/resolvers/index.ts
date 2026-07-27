import { adminResolvers } from './admin.js'
import { authResolvers } from './auth.js'
import { fieldResolvers } from './fields.js'
import { operationResolvers } from './operations.js'
import { queryResolvers } from './queries.js'
import { subscriptionResolvers } from './subscriptions.js'
import { executeMongooseQueries } from './executeQueries.js'

export const resolvers = executeMongooseQueries({
  ...fieldResolvers,
  Query: {
    ...queryResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...operationResolvers.Mutation,
    ...adminResolvers.Mutation
  },
  Subscription: {
    ...subscriptionResolvers.Subscription
  }
})
