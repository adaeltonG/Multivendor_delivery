import { PubSub } from 'graphql-subscriptions'

export const pubsub = new PubSub()

export const EVENTS = {
  ORDER: 'ORDER',
  RESTAURANT_ORDER_STATUS: 'RESTAURANT_ORDER_STATUS',
  ORDER_STATUS: 'ORDER_STATUS',
  RESTAURANT_ORDER: 'RESTAURANT_ORDER',
  ZONE_ORDER: 'ZONE_ORDER',
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  RIDER_LOCATION: 'RIDER_LOCATION',
  CHAT_MESSAGE: 'CHAT_MESSAGE'
} as const

export const topics = {
  order: (id: string) => `${EVENTS.ORDER}:${id}`,
  restaurantOrderStatus: (id: string) => `${EVENTS.RESTAURANT_ORDER_STATUS}:${id}`,
  orderStatus: (userId: string) => `${EVENTS.ORDER_STATUS}:${userId}`,
  restaurantOrder: (restaurantId: string) => `${EVENTS.RESTAURANT_ORDER}:${restaurantId}`,
  zoneOrder: (zoneId: string) => `${EVENTS.ZONE_ORDER}:${zoneId}`,
  riderAssigned: (riderId: string) => `${EVENTS.RIDER_ASSIGNED}:${riderId}`,
  riderLocation: (riderId: string) => `${EVENTS.RIDER_LOCATION}:${riderId}`,
  chat: (orderId: string) => `${EVENTS.CHAT_MESSAGE}:${orderId}`
}
