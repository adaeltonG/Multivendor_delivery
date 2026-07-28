import { Types } from 'mongoose'
import {
  Counter,
  Coupon,
  Order,
  Restaurant,
  Rider,
} from '../models/index.js'
import type { GraphQLContext } from '../graphql/context.js'
import { pubsub, topics } from '../graphql/pubsub.js'
import { badUserInput, forbidden, notFound, unauthenticated } from '../utils/errors.js'
import {
  dispatchWhatsApp,
  notifyWhatsAppOrderCreated,
  notifyWhatsAppOrderStatus,
  notifyWhatsAppRiderAssigned
} from './whatsapp.service.js'

type OrderInput = {
  food: string
  quantity: number
  variation: string
  addons?: Array<{ _id: string; options: string[] }>
  specialInstructions?: string
}

type AddressInput = {
  id?: string
  label?: string
  deliveryAddress: string
  details?: string
  longitude?: string
  latitude?: string
}

type PlaceOrderArgs = {
  restaurant: string
  orderInput: OrderInput[]
  paymentMethod: string
  couponCode?: string
  tipping: number
  taxationAmount: number
  address: AddressInput
  orderDate: string
  isPickedUp: boolean
  deliveryCharges: number
  instructions?: string
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export async function nextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
  return counter.value
}

export async function createOrder(
  args: PlaceOrderArgs,
  context: GraphQLContext
): Promise<any> {
  if (!context.user) unauthenticated()
  if (context.user.role !== 'CUSTOMER') forbidden('Only customers can place orders')
  if (!args.orderInput.length) badUserInput('An order must contain at least one item')

  const restaurant = await Restaurant.findOne({
    _id: args.restaurant,
    isActive: true,
    isAvailable: true
  })
  if (!restaurant) notFound('Restaurant')

  const items = args.orderInput.map(input => {
    const food = restaurant.categories
      .flatMap(category => category.foods)
      .find(item => item._id.equals(input.food))
    if (!food || !food.isActive) badUserInput(`Food ${input.food} is unavailable`)

    const variation = food.variations.find(item => item._id.equals(input.variation))
    if (!variation) badUserInput(`Variation ${input.variation} is unavailable`)

    const selectedAddons = (input.addons ?? []).map(inputAddon => {
      const addon = restaurant.addons.find(item => item._id.equals(inputAddon._id))
      if (!addon) badUserInput(`Add-on ${inputAddon._id} is unavailable`)
      if (
        inputAddon.options.length < addon.quantityMinimum ||
        inputAddon.options.length > addon.quantityMaximum
      ) {
        badUserInput(
          `${addon.title} requires ${addon.quantityMinimum}-${addon.quantityMaximum} options`
        )
      }
      const options = inputAddon.options.map(optionId => {
        if (!addon.options.some(id => id.equals(optionId))) {
          badUserInput(`Option ${optionId} does not belong to ${addon.title}`)
        }
        const option = restaurant.options.find(item => item._id.equals(optionId))
        if (!option) badUserInput(`Option ${optionId} is unavailable`)
        return {
          sourceId: option._id,
          title: option.title,
          description: option.description,
          price: option.price
        }
      })
      return {
        sourceId: addon._id,
        title: addon.title,
        description: addon.description,
        quantityMinimum: addon.quantityMinimum,
        quantityMaximum: addon.quantityMaximum,
        options
      }
    })

    const variationPrice =
      variation.discounted && variation.discounted > 0
        ? variation.discounted
        : variation.price
    const addonPrice = selectedAddons
      .flatMap(addon => addon.options)
      .reduce((sum, option) => sum + option.price, 0)
    const unitPrice = money(variationPrice + addonPrice)

    return {
      food: food._id,
      title: food.title,
      description: food.description,
      image: food.image,
      quantity: input.quantity,
      variation: {
        sourceId: variation._id,
        title: variation.title,
        price: variation.price,
        discounted: variation.discounted
      },
      addons: selectedAddons,
      specialInstructions: input.specialInstructions ?? '',
      unitPrice,
      lineTotal: money(unitPrice * input.quantity)
    }
  })

  let subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  if (args.couponCode) {
    const coupon = await Coupon.findOne({
      title: args.couponCode.toUpperCase(),
      enabled: true
    }).lean()
    if (!coupon) badUserInput('Coupon is invalid or disabled')
    subtotal = money(subtotal * (1 - coupon.discount / 100))
  }

  const latitude = Number(args.address.latitude)
  const longitude = Number(args.address.longitude)
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    badUserInput('Delivery coordinates are invalid')
  }

  const sequence = await nextSequence('orders')
  const orderId = `${restaurant.orderPrefix || 'EN'}-${String(sequence).padStart(6, '0')}`
  const order = await Order.create({
    orderId,
    user: context.user.id,
    restaurant: restaurant._id,
    zone: restaurant.zone,
    items,
    deliveryAddress: {
      id: args.address.id,
      label: args.address.label ?? 'Delivery',
      deliveryAddress: args.address.deliveryAddress,
      details: args.address.details ?? '',
      location: { type: 'Point', coordinates: [longitude, latitude] }
    },
    paymentMethod: args.paymentMethod,
    orderAmount: money(
      subtotal + args.deliveryCharges + args.tipping + args.taxationAmount
    ),
    deliveryCharges: money(args.deliveryCharges),
    tipping: money(args.tipping),
    taxationAmount: money(args.taxationAmount),
    orderDate: new Date(args.orderDate),
    isPickedUp: args.isPickedUp,
    instructions: args.instructions ?? ''
  })

  const event = { userId: context.user.id, origin: 'NEW_ORDER', order }
  await Promise.all([
    pubsub.publish(topics.order(order.id), { subscriptionOrder: order }),
    pubsub.publish(topics.restaurantOrder(restaurant.id), {
      subscribePlaceOrder: event
    }),
    restaurant.zone
      ? pubsub.publish(topics.zoneOrder(restaurant.zone.toString()), {
          subscriptionZoneOrders: {
            ...event,
            zoneId: restaurant.zone.toString()
          }
        })
      : Promise.resolve()
  ])
  dispatchWhatsApp(() => notifyWhatsAppOrderCreated(order.id), {
    orderId: order.orderId,
    notification: 'ORDER_CREATED'
  })

  return order
}

const allowedTransitions: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ASSIGNED', 'PICKED', 'CANCELLED', 'DELIVERED'],
  ASSIGNED: ['PICKED', 'CANCELLED', 'DELIVERED'],
  PREPARING: ['ASSIGNED', 'PICKED', 'CANCELLED'],
  PICKED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: []
}

export async function changeOrderStatus(
  id: string,
  requestedStatus: string,
  context: GraphQLContext,
  reason?: string
): Promise<any> {
  if (!context.user) unauthenticated()
  const status = requestedStatus.toUpperCase()
  const order = await Order.findById(id)
  if (!order) notFound('Order')

  const ownsOrder = order.user.equals(context.user.id)
  const ownsRestaurant =
    context.user.role === 'RESTAURANT' && order.restaurant.equals(context.user.restaurantId)
  const assignedRider =
    context.user.role === 'RIDER' &&
    order.rider?.equals(context.user.riderId ?? context.user.id)
  const elevated = context.user.role === 'ADMIN'
  if (!ownsOrder && !ownsRestaurant && !assignedRider && !elevated) forbidden()
  if (context.user.role === 'CUSTOMER' && status !== 'CANCELLED') forbidden()

  if (!elevated && !(allowedTransitions[order.orderStatus] ?? []).includes(status)) {
    badUserInput(`Cannot change an order from ${order.orderStatus} to ${status}`)
  }

  order.orderStatus = status as typeof order.orderStatus
  if (reason !== undefined) order.reason = reason
  const now = new Date()
  if (status === 'ACCEPTED') order.acceptedAt = now
  if (status === 'ASSIGNED') order.assignedAt = now
  if (status === 'PICKED') order.pickedAt = now
  if (status === 'DELIVERED' || status === 'COMPLETED') {
    order.deliveredAt = now
    order.completionTime = now
  }
  if (status === 'CANCELLED') order.cancelledAt = now
  await order.save()

  const event = { userId: order.user.toString(), origin: 'STATUS_CHANGED', order }
  await Promise.all([
    pubsub.publish(topics.order(order.id), { subscriptionOrder: order }),
    pubsub.publish(topics.restaurantOrderStatus(order.id), {
      subscribeOrderStatus: order
    }),
    pubsub.publish(topics.orderStatus(order.user.toString()), {
      orderStatusChanged: event
    })
  ])
  dispatchWhatsApp(() => notifyWhatsAppOrderStatus(order.id), {
    orderId: order.orderId,
    notification: 'ORDER_STATUS',
    status
  })
  return order
}

export async function assignRiderToOrder(
  orderId: string,
  riderId: string,
  context: GraphQLContext
): Promise<any> {
  if (!context.user) unauthenticated()
  if (!['ADMIN', 'RIDER'].includes(context.user.role)) forbidden()

  const [order, rider] = await Promise.all([
    Order.findById(orderId),
    Rider.findOne({ _id: riderId, isActive: true, available: true })
  ])
  if (!order) notFound('Order')
  if (!rider) notFound('Available rider')
  if (!['ACCEPTED', 'ASSIGNED'].includes(order.orderStatus)) {
    badUserInput('Only accepted orders can be assigned')
  }

  order.rider = rider._id
  order.orderStatus = 'ASSIGNED'
  order.assignedAt = new Date()
  rider.activeOrder = order._id
  rider.available = false
  await Promise.all([order.save(), rider.save()])

  await Promise.all([
    pubsub.publish(topics.order(order.id), { subscriptionOrder: order }),
    pubsub.publish(topics.riderAssigned(rider.id), {
      subscriptionAssignRider: {
        origin: 'ASSIGNED',
        order
      }
    }),
    pubsub.publish(topics.orderStatus(order.user.toString()), {
      orderStatusChanged: {
        userId: order.user.toString(),
        origin: 'ASSIGNED',
        order
      }
    })
  ])
  dispatchWhatsApp(() => notifyWhatsAppOrderStatus(order.id), {
    orderId: order.orderId,
    notification: 'ORDER_STATUS',
    status: 'ASSIGNED'
  })
  dispatchWhatsApp(() => notifyWhatsAppRiderAssigned(order.id), {
    orderId: order.orderId,
    notification: 'RIDER_ASSIGNED'
  })
  return order
}

export async function assertCanReadOrder(
  order: { user: Types.ObjectId; restaurant: Types.ObjectId; rider?: Types.ObjectId | null },
  context: GraphQLContext
): Promise<void> {
  if (!context.user) unauthenticated()
  if (context.user.role === 'ADMIN') return
  if (order.user.equals(context.user.id)) return
  if (
    context.user.role === 'RESTAURANT' &&
    order.restaurant.equals(context.user.restaurantId)
  ) {
    return
  }
  if (
    context.user.role === 'RIDER' &&
    order.rider?.equals(context.user.riderId ?? context.user.id)
  ) {
    return
  }
  forbidden()
}
