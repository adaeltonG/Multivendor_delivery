import { Types } from 'mongoose'
import {
  ChatMessage,
  Coupon,
  Earning,
  Order,
  Restaurant,
  Review,
  Rider,
  User,
  WithdrawRequest
} from '../../models/index.js'
import type { GraphQLContext } from '../context.js'
import { pubsub, topics } from '../pubsub.js'
import {
  assignRiderToOrder,
  changeOrderStatus,
  createOrder,
  nextSequence
} from '../../services/order.service.js'
import { comparePassword, hashPassword } from '../../utils/auth.js'
import { badUserInput, forbidden, notFound, unauthenticated } from '../../utils/errors.js'

function customer(context: GraphQLContext) {
  if (!context.user) unauthenticated()
  if (context.user.role !== 'CUSTOMER') forbidden()
  return context.user
}

export const operationResolvers = {
  Mutation: {
    async updateUser(
      _parent: unknown,
      { updateUserInput }: { updateUserInput: Record<string, unknown> },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findByIdAndUpdate(auth.id, updateUserInput, {
        new: true,
        runValidators: true
      })
      if (!user) notFound('User')
      return user
    },
    async updateNotificationStatus(
      _parent: unknown,
      args: { offerNotification: boolean; orderNotification: boolean },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findByIdAndUpdate(
        auth.id,
        {
          isOfferNotification: args.offerNotification,
          isOrderNotification: args.orderNotification
        },
        { new: true }
      )
      if (!user) notFound('User')
      return user
    },
    async pushToken(
      _parent: unknown,
      { token }: { token?: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findByIdAndUpdate(
        auth.id,
        { notificationToken: token ?? '' },
        { new: true }
      )
      if (!user) notFound('User')
      return user
    },
    async uploadToken(
      _parent: unknown,
      { id, pushToken }: { id: string; pushToken: string },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'ADMIN') forbidden()
      const user = await User.findByIdAndUpdate(id, { pushToken }, { new: true })
      if (!user) notFound('User')
      return user
    },
    async saveNotificationTokenWeb(
      _parent: unknown,
      { token }: { token: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      await User.updateOne({ _id: auth.id }, { $set: { notificationToken: token } })
      return { success: true, message: 'Notification token saved' }
    },
    async Deactivate(
      _parent: unknown,
      args: { isActive: boolean; email: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findOneAndUpdate(
        { _id: auth.id, email: args.email.toLowerCase() },
        { isActive: args.isActive },
        { new: true }
      )
      if (!user) notFound('User')
      return user
    },
    async createAddress(
      _parent: unknown,
      { addressInput }: { addressInput: Record<string, any> },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const longitude = Number(addressInput.longitude)
      const latitude = Number(addressInput.latitude)
      const user = await User.findById(auth.id)
      if (!user) notFound('User')
      if (!user.addresses.length) addressInput.selected = true
      user.addresses.push({
        label: addressInput.label ?? 'Home',
        deliveryAddress: addressInput.deliveryAddress,
        details: addressInput.details ?? '',
        selected: Boolean(addressInput.selected),
        location: { type: 'Point', coordinates: [longitude, latitude] }
      } as never)
      await user.save()
      return user
    },
    async editAddress(
      _parent: unknown,
      { addressInput }: { addressInput: Record<string, string> },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findById(auth.id)
      if (!user) notFound('User')
      const addresses = user.addresses as any
      const address = addresses.id(addressInput._id ?? addressInput.id)
      if (!address) notFound('Address')
      if (addressInput.label !== undefined) address.label = addressInput.label
      if (addressInput.deliveryAddress !== undefined) {
        address.deliveryAddress = addressInput.deliveryAddress
      }
      if (addressInput.details !== undefined) address.details = addressInput.details
      if (addressInput.longitude !== undefined && addressInput.latitude !== undefined) {
        address.location.coordinates = [
          Number(addressInput.longitude),
          Number(addressInput.latitude)
        ]
      }
      await user.save()
      return user
    },
    async deleteAddress(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findById(auth.id)
      if (!user) notFound('User')
      const addresses = user.addresses as any
      const wasSelected = addresses.id(id)?.selected
      addresses.pull({ _id: id })
      if (wasSelected && addresses[0]) addresses[0].selected = true
      await user.save()
      return user
    },
    async selectAddress(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findById(auth.id)
      if (!user) notFound('User')
      const addresses = user.addresses as any
      if (!addresses.id(id)) notFound('Address')
      addresses.forEach((address: any) => {
        address.selected = address._id.equals(id)
      })
      await user.save()
      return user
    },
    async addFavourite(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const user = await User.findById(auth.id)
      if (!user) notFound('User')
      const restaurantId = new Types.ObjectId(id)
      const index = user.favourite.findIndex(value => value.equals(restaurantId))
      if (index >= 0) user.favourite.splice(index, 1)
      else user.favourite.push(restaurantId)
      await user.save()
      return user
    },
    coupon: (_parent: unknown, { coupon }: { coupon: string }) =>
      Coupon.findOne({ title: coupon.toUpperCase(), enabled: true }),

    placeOrder: (_parent: unknown, args: never, context: GraphQLContext) =>
      createOrder(args, context),
    abortOrder: (
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => changeOrderStatus(id, 'CANCELLED', context, 'Cancelled by customer'),
    updateOrderStatus: (
      _parent: unknown,
      args: { id: string; status: string; reason?: string },
      context: GraphQLContext
    ) => changeOrderStatus(args.id, args.status, context, args.reason),
    updateStatus: (
      _parent: unknown,
      args: { id: string; orderStatus: string },
      context: GraphQLContext
    ) => changeOrderStatus(args.id, args.orderStatus, context),
    updateOrderStatusRider: (
      _parent: unknown,
      args: { id: string; status: string },
      context: GraphQLContext
    ) => changeOrderStatus(args.id, args.status, context),
    acceptOrder: (
      _parent: unknown,
      args: { _id: string; time?: string },
      context: GraphQLContext
    ) =>
      changeOrderStatus(args._id, 'ACCEPTED', context).then(async order => {
        if (args.time) {
          order.preparationTime = args.time
          await order.save()
        }
        return order
      }),
    cancelOrder: (
      _parent: unknown,
      args: { _id: string; reason: string },
      context: GraphQLContext
    ) => changeOrderStatus(args._id, 'CANCELLED', context, args.reason),
    orderPickedUp: (
      _parent: unknown,
      args: { _id: string },
      context: GraphQLContext
    ) => changeOrderStatus(args._id, 'PICKED', context),
    assignRider: (
      _parent: unknown,
      args: { id: string; riderId: string },
      context: GraphQLContext
    ) => assignRiderToOrder(args.id, args.riderId, context),
    async assignOrder(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RIDER') forbidden()
      return assignRiderToOrder(id, context.user.riderId ?? context.user.id, context)
    },
    async updatePaymentStatus(
      _parent: unknown,
      args: { id: string; status: string },
      context: GraphQLContext
    ) {
      if (!context.user || !['ADMIN', 'RESTAURANT'].includes(context.user.role)) forbidden()
      const order = await Order.findById(args.id)
      if (!order) notFound('Order')
      order.paymentStatus = args.status as typeof order.paymentStatus
      if (args.status === 'PAID') order.paidAmount = order.orderAmount
      await order.save()
      return order
    },
    async reviewOrder(
      _parent: unknown,
      { reviewInput }: { reviewInput: { order: string; rating: number; description?: string } },
      context: GraphQLContext
    ) {
      const auth = customer(context)
      const order = await Order.findOne({ _id: reviewInput.order, user: auth.id })
      if (!order) notFound('Order')
      if (!['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
        badUserInput('Only delivered orders can be reviewed')
      }
      const review = await Review.findOneAndUpdate(
        { order: order._id },
        {
          order: order._id,
          restaurant: order.restaurant,
          user: auth.id,
          rating: reviewInput.rating,
          description: reviewInput.description ?? ''
        },
        { new: true, upsert: true, runValidators: true }
      )
      order.review = review._id
      await order.save()
      const stats = await Review.aggregate([
        { $match: { restaurant: order.restaurant, isActive: true } },
        { $group: { _id: null, rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
      ])
      await Restaurant.updateOne(
        { _id: order.restaurant },
        {
          $set: {
            rating: stats[0]?.rating ?? 0,
            reviewCount: stats[0]?.reviewCount ?? 0
          }
        }
      )
      return order
    },
    async sendChatMessage(
      _parent: unknown,
      args: { orderId: string; message: { message: string } },
      context: GraphQLContext
    ) {
      if (!context.user) unauthenticated()
      const order = await Order.findById(args.orderId)
      if (!order) notFound('Order')
      let name = 'User'
      if (context.user.role === 'RIDER') {
        name = (await Rider.findById(context.user.riderId ?? context.user.id).select('name'))?.name ?? 'Rider'
      } else if (context.user.role === 'RESTAURANT') {
        name = (await Restaurant.findById(context.user.restaurantId).select('name'))?.name ?? 'Restaurant'
      } else {
        name = String(
          (await User.findById(context.user.id).select('name'))?.name ?? 'Customer'
        )
      }
      const data = await ChatMessage.create({
        order: order._id,
        message: args.message.message,
        user: { id: context.user.id, name }
      })
      await pubsub.publish(topics.chat(order.id), { subscriptionNewMessage: data })
      return { success: true, message: 'Message sent', data }
    },

    async updateRiderLocation(
      _parent: unknown,
      args: { latitude: string; longitude: string },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RIDER') forbidden()
      const latitude = Number(args.latitude)
      const longitude = Number(args.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        badUserInput('Latitude and longitude must be numeric')
      }
      const rider = await Rider.findByIdAndUpdate(
        context.user.riderId ?? context.user.id,
        {
          $set: {
            'location.coordinates': [longitude, latitude],
            available: true
          }
        },
        { new: true, runValidators: true }
      )
      if (!rider) notFound('Rider')
      await pubsub.publish(topics.riderLocation(rider.id), {
        subscriptionRiderLocation: rider
      })
      return rider
    },
    async toggleAvailablity(
      _parent: unknown,
      { id }: { id?: string },
      context: GraphQLContext
    ) {
      const riderId =
        context.user?.role === 'ADMIN' ? id : context.user?.riderId ?? context.user?.id
      if (!riderId || !context.user || !['ADMIN', 'RIDER'].includes(context.user.role)) forbidden()
      const rider = await Rider.findById(riderId)
      if (!rider) notFound('Rider')
      rider.available = !rider.available
      await rider.save()
      return rider
    },
    async saveRestaurantToken(
      _parent: unknown,
      args: { token?: string; isEnabled?: boolean },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RESTAURANT') forbidden()
      const restaurant = await Restaurant.findByIdAndUpdate(
        context.user.restaurantId,
        {
          notificationToken: args.token ?? '',
          enableNotification: args.isEnabled ?? true
        },
        { new: true }
      )
      if (!restaurant) notFound('Restaurant')
      return restaurant
    },
    async toggleAvailability(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RESTAURANT') forbidden()
      const restaurant = await Restaurant.findById(context.user.restaurantId)
      if (!restaurant) notFound('Restaurant')
      restaurant.isAvailable = !restaurant.isAvailable
      await restaurant.save()
      return restaurant
    },
    async muteRing(
      _parent: unknown,
      { orderId }: { orderId?: string },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RESTAURANT') forbidden()
      if (orderId) await Order.updateOne({ _id: orderId }, { $set: { isRinged: false } })
      return true
    },
    async createWithdrawRequest(
      _parent: unknown,
      { amount }: { amount: number },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RIDER') forbidden()
      const rider = await Rider.findById(context.user.riderId ?? context.user.id)
      if (!rider) notFound('Rider')
      if (amount <= 0 || amount > rider.currentWalletAmount) {
        badUserInput('Withdrawal amount exceeds the available balance')
      }
      const sequence = await nextSequence('withdrawals')
      return WithdrawRequest.create({
        requestId: `WR-${String(sequence).padStart(6, '0')}`,
        requestAmount: amount,
        rider: rider._id
      })
    },
    async createEarning(
      _parent: unknown,
      { earningsInput }: { earningsInput?: Record<string, unknown> },
      context: GraphQLContext
    ) {
      if (context.user?.role !== 'RIDER' || !earningsInput) forbidden()
      return Earning.create({
        ...earningsInput,
        rider: context.user.riderId ?? context.user.id
      })
    }
  }
}
