import React, { useContext, useEffect, useRef } from 'react'
import {
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  LocationAccuracy
} from 'expo-location'
import { useQuery, gql } from '@apollo/client'
import { profile, riderOrders } from '../apollo/queries'

import { updateLocation } from '../apollo/mutations'
import {
  subscriptionZoneOrders,
  subscriptionAssignRider
} from '../apollo/subscriptions'
import { useLocationContext } from './location'

const PROFILE = gql`
  ${profile}
`
const RIDER_ORDERS = gql`
  ${riderOrders}
`

const SUBSCRIPTION_UNASSIGNED_ORDER = gql`
  ${subscriptionZoneOrders}
`
const UPDATE_LOCATION = gql`
  ${updateLocation}
`

const UserContext = React.createContext({})

export const UserProvider = props => {
  const locationListener = useRef(null)
  const { locationPermission } = useLocationContext()

  const {
    loading: loadingProfile,
    error: errorProfile,
    data: dataProfile
  } = useQuery(PROFILE, {
    fetchPolicy: 'network-only',
    pollInterval: 10000,
    onError: error1
  })

  const {
    client,
    loading: loadingAssigned,
    error: errorAssigned,
    data: dataAssigned,
    networkStatus: networkStatusAssigned,
    subscribeToMore,
    refetch: refetchAssigned
  } = useQuery(RIDER_ORDERS, {
    onError: error2,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true
    // pollInterval: 15000
  })

  const riderId = dataProfile?.rider?._id
  const zoneId = dataProfile?.rider?.zone?._id

  useEffect(() => {
    if (!riderId || !zoneId) return
    const { unsubZoneOrder, unsubAssignOrder } = subscribeNewOrders(
      riderId,
      zoneId
    )

    return () => {
      unsubZoneOrder?.()
      unsubAssignOrder?.()
    }
  }, [riderId, zoneId, subscribeToMore])

  useEffect(() => {
    const trackRiderLocation = async() => {
      locationListener.current = await watchPositionAsync(
        { accuracy: LocationAccuracy.BestForNavigation, timeInterval: 10000 },
        async location => {
          client.mutate({
            mutation: UPDATE_LOCATION,
            variables: {
              latitude: location.coords.latitude.toString(),
              longitude: location.coords.longitude.toString()
            }
          })
        }
      )
    }
    trackRiderLocation()
    return () => {
      locationListener.current && locationListener.current.remove()
    }
  }, [locationPermission])

  function error1(error) {
    console.log('error on fetching context 1', JSON.stringify(error))
  }
  function error2(error) {
    console.log('error on fetching context 2', JSON.stringify(error))
  }

  const subscribeNewOrders = (currentRiderId, currentZoneId) => {
    try {
      const unsubAssignOrder = subscribeToMore({
        document: gql`
          ${subscriptionAssignRider}
        `,
        variables: { riderId: currentRiderId },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev
          if (subscriptionData.data.subscriptionAssignRider.origin === 'new') {
            return {
              riderOrders: [
                subscriptionData.data.subscriptionAssignRider.order,
                ...prev.riderOrders
              ]
            }
          } else if (
            subscriptionData.data.subscriptionAssignRider.origin === 'remove'
          ) {
            return {
              riderOrders: [
                ...prev.riderOrders.filter(
                  o =>
                    o._id !==
                    subscriptionData.data.subscriptionAssignRider.order._id
                )
              ]
            }
          }
          return prev
        }
      })
      const unsubZoneOrder = subscribeToMore({
        document: SUBSCRIPTION_UNASSIGNED_ORDER,
        variables: { zoneId: currentZoneId },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev

          if (subscriptionData.data.subscriptionZoneOrders.origin === 'new') {
            return {
              riderOrders: [
                subscriptionData.data.subscriptionZoneOrders.order,
                ...prev.riderOrders
              ]
            }
          }
          return prev
        }
      })
      return { unsubZoneOrder, unsubAssignOrder }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <UserContext.Provider
      value={{
        loadingProfile,
        errorProfile,
        dataProfile,
        loadingAssigned,
        errorAssigned,
        assignedOrders:
          loadingAssigned || errorAssigned ? [] : dataAssigned?.riderOrders ?? [],
        refetchAssigned,
        networkStatusAssigned,
        requestForegroundPermissionsAsync
      }}>
      {props.children}
    </UserContext.Provider>
  )
}
export const UserConsumer = UserContext.Consumer
export const useUserContext = () => useContext(UserContext)
export default UserContext
