import { Order, Rider } from '../../models/index.js'
import type { GraphQLContext } from '../context.js'
import { pubsub, topics } from '../pubsub.js'
import { assertCanReadOrder } from '../../services/order.service.js'
import { forbidden, notFound, unauthenticated } from '../../utils/errors.js'

async function orderTopic(id: string, context: GraphQLContext) {
  const order = await Order.findById(id)
  if (!order) notFound('Order')
  await assertCanReadOrder(order, context)
  return topics.order(id)
}

export const subscriptionResolvers = {
  Subscription: {
    subscriptionOrder: {
      subscribe: async (
        _parent: unknown,
        { id }: { id: string },
        context: GraphQLContext
      ) => pubsub.asyncIterableIterator(await orderTopic(id, context))
    },
    subscribeOrderStatus: {
      subscribe: async (
        _parent: unknown,
        { _id }: { _id: string },
        context: GraphQLContext
      ) => {
        await orderTopic(_id, context)
        return pubsub.asyncIterableIterator(topics.restaurantOrderStatus(_id))
      }
    },
    subscribePlaceOrder: {
      subscribe: (
        _parent: unknown,
        { restaurant }: { restaurant: string },
        context: GraphQLContext
      ) => {
        if (
          !context.user ||
          (context.user.role !== 'ADMIN' &&
            (context.user.role !== 'RESTAURANT' ||
              context.user.restaurantId !== restaurant))
        ) {
          forbidden()
        }
        return pubsub.asyncIterableIterator(topics.restaurantOrder(restaurant))
      }
    },
    orderStatusChanged: {
      subscribe: (
        _parent: unknown,
        { userId }: { userId: string },
        context: GraphQLContext
      ) => {
        if (!context.user || (context.user.role !== 'ADMIN' && context.user.id !== userId)) {
          forbidden()
        }
        return pubsub.asyncIterableIterator(topics.orderStatus(userId))
      }
    },
    subscriptionZoneOrders: {
      subscribe: async (
        _parent: unknown,
        { zoneId }: { zoneId: string },
        context: GraphQLContext
      ) => {
        if (!context.user) unauthenticated()
        if (context.user.role === 'RIDER') {
          const rider = await Rider.findById(context.user.riderId ?? context.user.id)
          if (!rider?.zone?.equals(zoneId)) forbidden()
        } else if (context.user.role !== 'ADMIN') forbidden()
        return pubsub.asyncIterableIterator(topics.zoneOrder(zoneId))
      }
    },
    subscriptionAssignRider: {
      subscribe: (
        _parent: unknown,
        { riderId }: { riderId: string },
        context: GraphQLContext
      ) => {
        if (
          !context.user ||
          (context.user.role !== 'ADMIN' &&
            context.user.riderId !== riderId &&
            context.user.id !== riderId)
        ) {
          forbidden()
        }
        return pubsub.asyncIterableIterator(topics.riderAssigned(riderId))
      }
    },
    subscriptionRiderLocation: {
      subscribe: async (
        _parent: unknown,
        { riderId }: { riderId: string },
        context: GraphQLContext
      ) => {
        if (!context.user) unauthenticated()
        if (context.user.role === 'CUSTOMER') {
          const allowed = await Order.exists({
            user: context.user.id,
            rider: riderId,
            orderStatus: { $nin: ['DELIVERED', 'COMPLETED', 'CANCELLED'] }
          })
          if (!allowed) forbidden()
        }
        return pubsub.asyncIterableIterator(topics.riderLocation(riderId))
      }
    },
    subscriptionNewMessage: {
      subscribe: async (
        _parent: unknown,
        { order }: { order: string },
        context: GraphQLContext
      ) => {
        await orderTopic(order, context)
        return pubsub.asyncIterableIterator(topics.chat(order))
      }
    }
  }
}
