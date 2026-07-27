import { model, Schema, type InferSchemaType } from 'mongoose'
import { addressSchema } from './common.js'

export const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'ASSIGNED',
  'PREPARING',
  'PICKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED'
] as const

const orderVariationSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discounted: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
)

const orderOptionSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, min: 0, required: true }
  },
  { timestamps: true }
)

const orderAddonSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    quantityMinimum: { type: Number, default: 0 },
    quantityMaximum: { type: Number, default: 1 },
    options: { type: [orderOptionSchema], default: [] }
  },
  { timestamps: true }
)

const orderItemSchema = new Schema(
  {
    food: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    quantity: { type: Number, min: 1, required: true },
    variation: { type: orderVariationSchema, required: true },
    addons: { type: [orderAddonSchema], default: [] },
    specialInstructions: { type: String, maxlength: 500, default: '' },
    unitPrice: { type: Number, min: 0, required: true },
    lineTotal: { type: Number, min: 0, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    rider: { type: Schema.Types.ObjectId, ref: 'Rider', default: null, index: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', index: true },
    items: { type: [orderItemSchema], required: true },
    deliveryAddress: { type: addressSchema, required: true },
    paymentMethod: { type: String, required: true },
    paidAmount: { type: Number, min: 0, default: 0 },
    orderAmount: { type: Number, min: 0, required: true },
    deliveryCharges: { type: Number, min: 0, default: 0 },
    tipping: { type: Number, min: 0, default: 0 },
    taxationAmount: { type: Number, min: 0, default: 0 },
    status: { type: Boolean, default: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true
    },
    reason: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    orderDate: { type: Date, default: Date.now },
    expectedTime: { type: Date },
    completionTime: { type: Date },
    preparationTime: { type: String, default: '' },
    isPickedUp: { type: Boolean, default: false },
    instructions: { type: String, maxlength: 1000, default: '' },
    isRinged: { type: Boolean, default: false },
    isRiderRinged: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    pickedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    assignedAt: { type: Date },
    review: { type: Schema.Types.ObjectId, ref: 'Review' }
  },
  { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } }
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ restaurant: 1, orderStatus: 1, createdAt: -1 })
orderSchema.index({ rider: 1, orderStatus: 1, createdAt: -1 })
orderSchema.index({ zone: 1, orderStatus: 1, createdAt: -1 })

export type OrderDocument = InferSchemaType<typeof orderSchema>
export const Order = model('Order', orderSchema)
