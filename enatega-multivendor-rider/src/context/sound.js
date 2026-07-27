import React, { useContext, useEffect } from 'react'
import { useTabsContext } from './tabs'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'
import { useUserContext } from './user'
const SoundContext = React.createContext()
export const SoundContextProvider = ({ children }) => {
  const player = useAudioPlayer(require('../assets/beep3.mp3'))
  const { active } = useTabsContext()
  const { assignedOrders } = useUserContext()

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
    if (assignedOrders) {
      const shouldPlaySound = assignedOrders.some(o => o.isRiderRinged)
      if (shouldPlaySound) playSound()
      else stopSound()
    }
  }, [assignedOrders])
  const playSound = async() => {
    if (active === 'NewOrders') {
      await stopSound()
      player.loop = true
      player.play()
    }
  }
  const stopSound = async() => {
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
