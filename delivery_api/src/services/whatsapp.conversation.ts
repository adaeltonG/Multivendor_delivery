export function reopenClosedConversationForBot(conversation: any): boolean {
  if (conversation.status !== 'CLOSED') return false

  conversation.status = 'BOT'
  conversation.botState = conversation.restaurant
    ? 'BROWSING_MENU'
    : 'SELECTING_RESTAURANT'
  conversation.cart.splice(0, conversation.cart.length)
  conversation.deliveryAddress = ''
  conversation.deliveryLocation = undefined
  conversation.paymentMethod = ''
  conversation.order = null
  return true
}
