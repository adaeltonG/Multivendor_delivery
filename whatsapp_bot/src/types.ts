export type ConversationStatus = 'BOT' | 'MANUAL' | 'CLOSED'

export interface OrderSummary {
  _id: string
  orderId?: string | null
  orderStatus?: string | null
  orderAmount?: number | null
}

export interface CartItem {
  foodId: string
  variationId?: string | null
  title: string
  quantity: number
  unitPrice: number
}

export interface Conversation {
  _id: string
  restaurant: string
  customerWaId: string
  customerName?: string | null
  status: ConversationStatus
  botState?: string | null
  unreadCount: number
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  order?: OrderSummary | null
  cart?: CartItem[] | null
  createdAt: string
  updatedAt: string
}

export interface WhatsAppMessage {
  _id: string
  conversation?: string
  direction: 'INBOUND' | 'OUTBOUND'
  type: string
  text?: string | null
  status?: string | null
  metaMessageId?: string | null
  createdAt: string
}
