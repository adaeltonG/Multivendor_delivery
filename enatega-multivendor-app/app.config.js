module.exports = ({ config }) => {
  const androidMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
  const iosMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(iosMapsApiKey
        ? {
            config: {
              ...config.ios?.config,
              googleMapsApiKey: iosMapsApiKey
            }
          }
        : {})
    },
    android: {
      ...config.android,
      ...(androidMapsApiKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: androidMapsApiKey
              }
            }
          }
        : {})
    }
  }
}
