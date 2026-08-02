/* eslint-disable react/display-name */
import React from 'react'
import { textStyles } from '../utilities/textStyles'
import { scale } from '../utilities/scaling'
import colors from '../utilities/colors'
import { Ionicons } from '@expo/vector-icons'
import {
  getFocusedRouteNameFromRoute,
  useRoute
} from '@react-navigation/native'

const screenOptions = props => {
  const route = useRoute()
  const routeName = getFocusedRouteNameFromRoute(route)
  return {
    headerShown: routeName === 'ChatWithCustomer'
  }
}
const tabIcon = route => ({
  tabBarIcon: ({ color, focused }) => {
    const icons = {
      Home: focused ? 'home' : 'home-outline',
      MyOrders: focused ? 'receipt' : 'receipt-outline',
      Wallet: focused ? 'wallet' : 'wallet-outline',
      Language: focused ? 'globe' : 'globe-outline',
      Profile: focused ? 'person' : 'person-outline'
    }
    return <Ionicons name={icons[route.name]} size={23} color={color} />
  }
})

const tabOptions = bottomInset => ({
  headerShown: false,
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: colors.iconPink,
  tabBarInactiveTintColor: colors.white,
  tabBarIconStyle: {
    marginTop: scale(5)
  },
  tabBarItemStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(3)
  },
  tabBarLabelStyle: {
    ...textStyles.Bold,
    ...textStyles.Center,
    fontSize: 11,
    lineHeight: 14,
    marginTop: scale(2),
    width: '100%'
  },
  tabBarAllowFontScaling: false,
  tabBarStyle: {
    backgroundColor: '#2c2c2c',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderTopWidth: 0,
    height: 62 + bottomInset,
    paddingTop: scale(4),
    paddingBottom: Math.max(bottomInset, scale(4))
  }
})

export { screenOptions, tabOptions, tabIcon }
