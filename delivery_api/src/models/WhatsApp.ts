import { model, Schema, type InferSchemaType } from 'mongoose'

export const WHATSAPP_CONVERSATION_STATUSES = ['BOT', 'MANUAL', 'CLOSED'] as const
export const WHATSAPP_BOT_STATES = [
  'WELCOME',
  'SELECTING_RESTAURANT',
  'BROWSING_MENU',
  'VIEWING_CART',
  'AWAITING_ADDRESS',
  'AWAITING_LOCATION',
  'AWAITING_PAYMENT',
  'ORDER_CREATED'
] as const

const whatsappConnectionSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
      default: null
    },
    phoneNumberId: { type: String, required: true, unique: true, index: true },
    whatsappBusinessAccountId: { type: String, trim: true, default: '' },
    displayPhoneNumber: { type: String, trim: true, default: '' },
    verifiedName: { type: String, trim: true, default: '' },
    accessTokenEncrypted: { type: String, select: false, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
)
whatsappConnectionSchema.index({ restaurant: 1, isActive: 1 })

const whatsappCartItemSchema = new Schema(
  {
    foodId: { type: Schema.Types.ObjectId, required: true },
    variationId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
)

const whatsappConversationSchema = new Schema(
  {
    connection: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppConnection',
      required: true,
      index: true
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
      default: null
    },
    customerWaId: { type: String, required: true, index: true },
    customerName: { type: String, trim: true, default: 'WhatsApp customer' },
    purpose: {
      type: String,
      enum: ['ORDERING', 'OPERATIONAL'],
      default: 'ORDERING',
      index: true
    },
    status: {
      type: String,
      enum: WHATSAPP_CONVERSATION_STATUSES,
      default: 'BOT',
      index: true
    },
    botState: {
      type: String,
      enum: WHATSAPP_BOT_STATES,
      default: 'WELCOME'
    },
    cart: { type: [whatsappCartItemSchema], default: [] },
    deliveryAddress: { type: String, trim: true, default: '' },
    deliveryLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    paymentMethod: { type: String, enum: ['COD', 'CARD', ''], default: '' },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    unreadCount: { type: Number, min: 0, default: 0 },
    lastMessagePreview: { type: String, maxlength: 240, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastInboundAt: { type: Date },
    lastOutboundAt: { type: Date }
  },
  { timestamps: true }
)
whatsappConversationSchema.index(
  { connection: 1, customerWaId: 1, purpose: 1 },
  { unique: true }
)
whatsappConversationSchema.index({ restaurant: 1, status: 1, lastMessageAt: -1 })

const whatsappMessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppConversation',
      required: true,
      index: true
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
      default: null
    },
    connection: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppConnection',
      required: true,
      index: true
    },
    metaMessageId: { type: String, sparse: true, unique: true, index: true },
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'LOCATION', 'INTERACTIVE', 'TEMPLATE', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    text: { type: String, maxlength: 4096, default: '' },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'RECEIVED',
      index: true
    },
    error: { type: String, maxlength: 2000, default: '' }
  },
  { timestamps: true }
)
whatsappMessageSchema.index({ conversation: 1, createdAt: -1 })
whatsappMessageSchema.index({ restaurant: 1, createdAt: -1 })

export type WhatsAppConnectionDocument = InferSchemaType<typeof whatsappConnectionSchema>
export type WhatsAppConversationDocument = InferSchemaType<typeof whatsappConversationSchema>
export type WhatsAppMessageDocument = InferSchemaType<typeof whatsappMessageSchema>

export const WhatsAppConnection = model('WhatsAppConnection', whatsappConnectionSchema)
export const WhatsAppConversation = model('WhatsAppConversation', whatsappConversationSchema)
export const WhatsAppMessage = model('WhatsAppMessage', whatsappMessageSchema)
