import { Restaurant, User, WhatsAppConversation } from '../models/index.js'
import { createOrder } from './order.service.js'
import {
  publishWhatsAppConversation,
  sendWhatsAppList,
  sendWhatsAppReplyButtons,
  sendWhatsAppText
} from './whatsapp.gateway.js'

export type BotInboundMessage = {
  type: string
  text?: string
  interactiveId?: string
  latitude?: number
  longitude?: number
}

const formatMoney = (value: number) => `£${value.toFixed(2)}`

async function sendRestaurantList(conversation: any) {
  const restaurants = await Restaurant.find({
    isActive: true,
    isAvailable: true
  })
    .select('name address')
    .sort({ name: 1 })
    .limit(10)
    .lean()
  if (!restaurants.length) {
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'No restaurants are accepting WhatsApp orders right now. Please try again later.',
      { conversationId: conversation.id }
    )
    return
  }
  await sendWhatsAppList(
    conversation.connection.toString(),
    conversation.customerWaId,
    'Welcome to NextHop. Choose a restaurant to start your order.',
    'Restaurants',
    [
      {
        title: 'Available now',
        rows: restaurants.map(restaurant => ({
          id: `restaurant:${restaurant._id}`,
          title: restaurant.name,
          description: restaurant.address
        }))
      }
    ],
    { conversationId: conversation.id }
  )
}

async function sendMenu(conversation: any, page = 0) {
  const restaurant = await Restaurant.findOne({
    _id: conversation.restaurant,
    isActive: true,
    isAvailable: true
  }).lean()
  if (!restaurant) {
    conversation.restaurant = null
    conversation.botState = 'SELECTING_RESTAURANT'
    await conversation.save()
    await sendRestaurantList(conversation)
    return
  }
  const allMenuRows = restaurant.categories
    .flatMap(category =>
      category.foods
        .filter(food => food.isActive && food.variations.length)
        .flatMap(food =>
          food.variations.map(variation => ({
            category: category.title,
            food,
            variation
          }))
        )
    )
  if (!allMenuRows.length) {
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      `${restaurant.name} has no WhatsApp menu items available right now.`,
      { conversationId: conversation.id }
    )
    return
  }
  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(allMenuRows.length / pageSize))
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const menuRows = allMenuRows.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  )
  const navigationRows = [
    ...(safePage > 0
      ? [{
          id: `menu_page:${safePage - 1}`,
          title: 'Previous items',
          description: `Page ${safePage} of ${pageCount}`
        }]
      : []),
    ...(safePage < pageCount - 1
      ? [{
          id: `menu_page:${safePage + 1}`,
          title: 'More items',
          description: `Page ${safePage + 2} of ${pageCount}`
        }]
      : [])
  ]
  await sendWhatsAppList(
    conversation.connection.toString(),
    conversation.customerWaId,
    `Ordering from ${restaurant.name}. Select an item to add it to your cart.`,
    'View menu',
    [
      {
        title: 'Menu',
        rows: [
          ...menuRows.map(({ category, food, variation }) => {
          const price =
            variation.discounted && variation.discounted > 0
              ? variation.discounted
              : variation.price
          return {
            id: `item:${food._id}:${variation._id}`,
            title: food.title,
            description: `${category} - ${variation.title} - ${formatMoney(price)}`
            }
          }),
          ...navigationRows
        ]
      }
    ],
    { conversationId: conversation.id }
  )
}

function cartTotal(conversation: any): number {
  return conversation.cart.reduce(
    (total: number, item: any) => total + item.unitPrice * item.quantity,
    0
  )
}

async function sendCart(conversation: any) {
  if (!conversation.cart.length) {
    await sendWhatsAppReplyButtons(
      conversation.connection.toString(),
      conversation.customerWaId,
      'Your cart is empty.',
      [{ id: 'menu', title: 'View menu' }],
      { conversationId: conversation.id }
    )
    return
  }
  const lines = conversation.cart.map(
    (item: any) =>
      `${item.quantity} × ${item.title} — ${formatMoney(item.quantity * item.unitPrice)}`
  )
  await sendWhatsAppReplyButtons(
    conversation.connection.toString(),
    conversation.customerWaId,
    `${lines.join('\n')}\n\nTotal: ${formatMoney(cartTotal(conversation))}`,
    [
      { id: 'checkout', title: 'Checkout' },
      { id: 'menu', title: 'Add more' },
      { id: 'clear_cart', title: 'Clear cart' }
    ],
    { conversationId: conversation.id }
  )
}

async function addItem(conversation: any, value: string) {
  if (!conversation.restaurant) return
  const [, foodId, variationId] = value.split(':')
  const restaurant = await Restaurant.findById(conversation.restaurant)
  const food = restaurant?.categories
    .flatMap(category => category.foods)
    .find(item => item._id.equals(foodId))
  const variation = food?.variations.find(item => item._id.equals(variationId))
  if (!food || !variation || !food.isActive) {
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'That menu item is no longer available. Please choose another item.',
      { conversationId: conversation.id }
    )
    await sendMenu(conversation)
    return
  }
  const price =
    variation.discounted && variation.discounted > 0
      ? variation.discounted
      : variation.price
  const existing = conversation.cart.find(
    (item: any) =>
      item.foodId.equals(food._id) && item.variationId.equals(variation._id)
  )
  if (existing) existing.quantity += 1
  else {
    conversation.cart.push({
      foodId: food._id,
      variationId: variation._id,
      title: food.title,
      quantity: 1,
      unitPrice: price
    })
  }
  conversation.botState = 'VIEWING_CART'
  await conversation.save()
  await publishWhatsAppConversation(conversation)
  await sendCart(conversation)
}

async function ensureCustomer(conversation: any) {
  const existing = await User.findOne({ phone: conversation.customerWaId })
  if (existing) {
    if (existing.userType !== 'CUSTOMER') {
      throw new Error('This WhatsApp number belongs to a non-customer account')
    }
    return existing
  }
  return User.create({
    name: conversation.customerName || 'WhatsApp customer',
    phone: conversation.customerWaId,
    phoneIsVerified: true,
    userType: 'CUSTOMER'
  })
}

async function createConversationOrder(conversation: any, paymentMethod: 'COD' | 'CARD') {
  if (
    !conversation.restaurant ||
    !conversation.cart.length ||
    !conversation.deliveryAddress ||
    !Number.isFinite(conversation.deliveryLocation?.latitude) ||
    !Number.isFinite(conversation.deliveryLocation?.longitude)
  ) {
    throw new Error('WhatsApp checkout is incomplete')
  }
  const customer = await ensureCustomer(conversation)
  const order = await createOrder(
    {
      restaurant: conversation.restaurant.toString(),
      orderInput: conversation.cart.map((item: any) => ({
        food: item.foodId.toString(),
        variation: item.variationId.toString(),
        quantity: item.quantity,
        addons: []
      })),
      paymentMethod,
      tipping: 0,
      taxationAmount: 0,
      address: {
        label: 'WhatsApp delivery',
        deliveryAddress: conversation.deliveryAddress,
        latitude: String(conversation.deliveryLocation.latitude),
        longitude: String(conversation.deliveryLocation.longitude)
      },
      orderDate: new Date().toISOString(),
      isPickedUp: false,
      deliveryCharges: 0,
      instructions: 'Placed through the NextHop WhatsApp bot'
    },
    { user: { id: customer.id, role: 'CUSTOMER' } }
  )
  conversation.paymentMethod = paymentMethod
  conversation.order = order._id
  conversation.botState = 'ORDER_CREATED'
  conversation.cart = []
  await conversation.save()
  await publishWhatsAppConversation(conversation)
  const paymentNote =
    paymentMethod === 'CARD'
      ? ' Your order is awaiting card payment; the restaurant will send a secure payment link.'
      : ' Please pay the restaurant according to its cash-on-delivery instructions.'
  await sendWhatsAppText(
    conversation.connection.toString(),
    conversation.customerWaId,
    `Order ${order.orderId} has been created for ${formatMoney(order.orderAmount)}.${paymentNote}`,
    { conversationId: conversation.id }
  )
}

function normalizedAction(message: BotInboundMessage): string {
  return (message.interactiveId || message.text || '').trim()
}

export async function processWhatsAppBotMessage(
  conversationId: string,
  message: BotInboundMessage
) {
  const conversation = await WhatsAppConversation.findById(conversationId)
  if (
    !conversation ||
    conversation.status !== 'BOT' ||
    conversation.purpose !== 'ORDERING'
  ) return
  const action = normalizedAction(message)
  const command = action.toLowerCase()

  if (['human', 'agent', 'help'].includes(command)) {
    conversation.status = 'MANUAL'
    await conversation.save()
    await publishWhatsAppConversation(conversation)
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'A restaurant team member will reply here as soon as possible.',
      { conversationId: conversation.id }
    )
    return
  }

  if (['start', 'restart'].includes(command)) {
    conversation.botState = conversation.restaurant ? 'BROWSING_MENU' : 'SELECTING_RESTAURANT'
    conversation.cart.splice(0, conversation.cart.length)
    conversation.deliveryAddress = ''
    conversation.deliveryLocation = undefined
    conversation.paymentMethod = ''
    conversation.order = null
    await conversation.save()
  }

  if (command === 'cart') {
    await sendCart(conversation)
    return
  }
  if (command === 'menu') {
    conversation.botState = 'BROWSING_MENU'
    await conversation.save()
    await sendMenu(conversation)
    return
  }
  if (action.startsWith('menu_page:')) {
    const page = Number(action.slice('menu_page:'.length))
    await sendMenu(conversation, Number.isInteger(page) ? page : 0)
    return
  }
  if (command === 'clear_cart') {
    conversation.cart.splice(0, conversation.cart.length)
    conversation.botState = 'BROWSING_MENU'
    await conversation.save()
    await publishWhatsAppConversation(conversation)
    await sendMenu(conversation)
    return
  }
  if (action.startsWith('restaurant:')) {
    const restaurant = await Restaurant.findOne({
      _id: action.slice('restaurant:'.length),
      isActive: true,
      isAvailable: true
    })
    if (!restaurant) {
      await sendRestaurantList(conversation)
      return
    }
    conversation.restaurant = restaurant._id
    conversation.botState = 'BROWSING_MENU'
    await conversation.save()
    await publishWhatsAppConversation(conversation)
    await sendMenu(conversation)
    return
  }
  if (action.startsWith('item:')) {
    await addItem(conversation, action)
    return
  }
  if (command === 'checkout') {
    if (!conversation.cart.length) {
      await sendCart(conversation)
      return
    }
    conversation.botState = 'AWAITING_ADDRESS'
    await conversation.save()
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'Please type the complete delivery address, including postcode.',
      { conversationId: conversation.id }
    )
    return
  }
  if (conversation.botState === 'AWAITING_ADDRESS' && message.type === 'text' && action) {
    conversation.deliveryAddress = action.slice(0, 500)
    conversation.botState = 'AWAITING_LOCATION'
    await conversation.save()
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'Now share your current location using WhatsApp: attach (+) → Location → Send your current location.',
      { conversationId: conversation.id }
    )
    return
  }
  if (
    conversation.botState === 'AWAITING_LOCATION' &&
    message.type === 'location' &&
    Number.isFinite(message.latitude) &&
    Number.isFinite(message.longitude)
  ) {
    conversation.deliveryLocation = {
      latitude: message.latitude,
      longitude: message.longitude
    }
    conversation.botState = 'AWAITING_PAYMENT'
    await conversation.save()
    await sendWhatsAppReplyButtons(
      conversation.connection.toString(),
      conversation.customerWaId,
      `Choose payment for your ${formatMoney(cartTotal(conversation))} order.`,
      [
        { id: 'payment:COD', title: 'Pay on delivery' },
        { id: 'payment:CARD', title: 'Pay by card' }
      ],
      { conversationId: conversation.id }
    )
    return
  }
  if (conversation.botState === 'AWAITING_LOCATION') {
    await sendWhatsAppText(
      conversation.connection.toString(),
      conversation.customerWaId,
      'Please use WhatsApp’s location attachment. A typed address alone cannot verify delivery coordinates.',
      { conversationId: conversation.id }
    )
    return
  }
  if (
    conversation.botState === 'AWAITING_PAYMENT' &&
    (action === 'payment:COD' || action === 'payment:CARD')
  ) {
    await createConversationOrder(conversation, action.slice('payment:'.length) as 'COD' | 'CARD')
    return
  }
  if (!conversation.restaurant) {
    conversation.botState = 'SELECTING_RESTAURANT'
    await conversation.save()
    await sendRestaurantList(conversation)
    return
  }
  conversation.botState = 'BROWSING_MENU'
  await conversation.save()
  await sendMenu(conversation)
}
