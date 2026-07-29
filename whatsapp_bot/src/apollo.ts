import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  split
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

const httpUrl = import.meta.env.VITE_GRAPHQL_URL || '/api/graphql'

const inferWsUrl = () => {
  if (import.meta.env.VITE_GRAPHQL_WS_URL) {
    return import.meta.env.VITE_GRAPHQL_WS_URL
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/graphql`
}

const httpLink = new HttpLink({ uri: httpUrl })

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('nexthop_token')
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: inferWsUrl(),
    lazy: true,
    retryAttempts: 8,
    connectionParams: () => {
      const token = localStorage.getItem('nexthop_token')
      return token ? { authorization: `Bearer ${token}` } : {}
    }
  })
)

const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink)
)

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          whatsappMessages: {
            keyArgs: ['conversationId'],
            merge: false
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all'
    }
  }
})
