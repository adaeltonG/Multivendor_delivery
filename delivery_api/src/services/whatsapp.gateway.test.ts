import { describe, expect, it } from 'vitest'
import { reopenClosedConversationForBot } from './whatsapp.conversation.js'

describe('reopenClosedConversationForBot', () => {
  it('starts a fresh bot ordering session when a closed customer writes again', () => {
    const conversation = {
      status: 'CLOSED',
      botState: 'ORDER_CREATED',
      restaurant: 'restaurant-id',
      cart: [{ title: 'Old item' }],
      deliveryAddress: 'Old address',
      deliveryLocation: { latitude: 1, longitude: 2 },
      paymentMethod: 'CARD',
      order: 'old-order-id'
    }

    expect(reopenClosedConversationForBot(conversation)).toBe(true)
    expect(conversation).toMatchObject({
      status: 'BOT',
      botState: 'BROWSING_MENU',
      cart: [],
      deliveryAddress: '',
      deliveryLocation: undefined,
      paymentMethod: '',
      order: null
    })
  })

  it('does not interrupt an open manual conversation', () => {
    const conversation = {
      status: 'MANUAL',
      restaurant: 'restaurant-id',
      cart: [{ title: 'Current item' }]
    }

    expect(reopenClosedConversationForBot(conversation)).toBe(false)
    expect(conversation.status).toBe('MANUAL')
    expect(conversation.cart).toHaveLength(1)
  })
})
