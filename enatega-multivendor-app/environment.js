// /*****************************
//  * environment.js
//  * path: '/environment.js' (root of your project)
//  ******************************/

import { useContext } from 'react'
import ConfigurationContext from './src/context/Configuration'
import * as Updates from 'expo-updates'

const useEnvVars = (env = Updates.channel) => {
  const configuration = useContext(ConfigurationContext)

  if (env === 'production' || env === 'staging') {
    return {
      GRAPHQL_URL: 'https://zetahub.co.uk/api/graphql',
      WS_GRAPHQL_URL: 'wss://zetahub.co.uk/api/graphql',
      SERVER_URL: 'https://zetahub.co.uk/api/',
      IOS_CLIENT_ID_GOOGLE:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        configuration.iOSClientID,
      ANDROID_CLIENT_ID_GOOGLE:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        configuration.androidClientID,
      AMPLITUDE_API_KEY: configuration.appAmplitudeApiKey,
      GOOGLE_MAPS_KEY: configuration.googleApiKey,
      EXPO_CLIENT_ID: configuration.expoClientId,
      SENTRY_DSN: configuration.customerAppSentryUrl,
      TERMS_AND_CONDITIONS: configuration.termsAndConditions,
      PRIVACY_POLICY: configuration.privacyPolicy,
      TEST_OTP: configuration.testOtp,
      GOOGLE_PACES_API_BASE_URL: configuration.googlePlacesApiBaseUrl
    }
  }

  return {
    GRAPHQL_URL: 'https://zetahub.co.uk/api/graphql',
    WS_GRAPHQL_URL: 'wss://zetahub.co.uk/api/graphql',
    SERVER_URL: 'https://zetahub.co.uk/api/',
    // GRAPHQL_URL: 'http://10.97.25.37:8001/graphql',
    // WS_GRAPHQL_URL: 'ws://10.97.25.37:8001/graphql',
    // SERVER_URL: 'http://10.97.25.37:8001/',
    IOS_CLIENT_ID_GOOGLE:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      configuration.iOSClientID,
    ANDROID_CLIENT_ID_GOOGLE:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      configuration.androidClientID,
    AMPLITUDE_API_KEY: configuration.appAmplitudeApiKey,
    GOOGLE_MAPS_KEY: configuration.googleApiKey,
    EXPO_CLIENT_ID: configuration.expoClientID,
    SENTRY_DSN: configuration.customerAppSentryUrl,
    TERMS_AND_CONDITIONS: configuration.termsAndConditions,
    PRIVACY_POLICY: configuration.privacyPolicy,
    TEST_OTP: configuration.testOtp,
    GOOGLE_PACES_API_BASE_URL: configuration.googlePlacesApiBaseUrl
  }
}

export default useEnvVars
