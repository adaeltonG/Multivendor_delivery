import React, { useContext, useEffect } from 'react'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'
import { useRestaurantContext } from './restaurant'
const SoundContext = React.createContext()
export const SoundContextProvider = ({ children }) => {
  const player = useAudioPlayer(require('../../assets/beep.mp3'))
  const { data } = useRestaurantContext()

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false
    })
  }, [])

  useEffect(() => {
    if (data) {
      const activeOrders =
        data &&
        data.restaurantOrders.filter(order => order.orderStatus === 'PENDING')
      const shouldPlaySound = activeOrders.some(o => o.isRinged)
      if (shouldPlaySound) playSound()
      else stopSound()
    }
  }, [data])
  const playSound = async () => {
    await stopSound()
    player.loop = true
    player.play()
  }
  const stopSound = async () => {
    player.pause()
    await player.seekTo(0)
  }
  return (
    <SoundContext.Provider value={{ playSound, stopSound }}>
      {children}
    </SoundContext.Provider>
  )
}
export const SoundContextConsumer = SoundContext.Consumer
export const useSoundContext = () => useContext(SoundContext)
export default SoundContext
