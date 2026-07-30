import * as Updates from 'expo-updates'
import { useContext } from 'react'
import ConfigurationContext from './src/context/configuration'

const getEnvVars = (env = Updates.releaseChannel) => {
  const configuration = useContext(ConfigurationContext)

  if (env === 'production' || env === 'staging') {
    return {
      GRAPHQL_URL: 'https://zetahub.co.uk/api/graphql',
      WS_GRAPHQL_URL: 'wss://zetahub.co.uk/api/graphql',
      SENTRY_DSN: configuration.riderAppSentryUrl,
      GOOGLE_MAPS_KEY: configuration.googleApiKey
    }
  }
  return {
    GRAPHQL_URL: 'https://zetahub.co.uk/api/graphql',
    WS_GRAPHQL_URL: 'wss://zetahub.co.uk/api/graphql',
    SENTRY_DSN: configuration.riderAppSentryUrl,
    GOOGLE_MAPS_KEY: configuration.googleApiKey
    // SENTRY_DSN:
    //   'https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261', // [Add your own Sentry DSN link][example: https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/5135261]
  }
}

export default getEnvVars
