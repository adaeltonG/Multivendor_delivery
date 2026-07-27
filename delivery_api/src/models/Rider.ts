import { model, Schema, type InferSchemaType } from 'mongoose'
import { pointSchema } from './common.js'

const riderSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    username: { type: String, trim: true, lowercase: true, required: true, unique: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true, required: true },
    image: { type: String, default: '' },
    available: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    location: { type: pointSchema, required: true, default: () => ({}) },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', index: true },
    activeOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    notificationToken: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    currentWalletAmount: { type: Number, default: 0 },
    totalWalletAmount: { type: Number, default: 0 },
    withdrawnWalletAmount: { type: Number, default: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true } }
)

// GeoJSON coordinates are always persisted as [longitude, latitude].
riderSchema.index({ location: '2dsphere' })
riderSchema.index({ available: 1, isActive: 1, zone: 1 })

export type RiderDocument = InferSchemaType<typeof riderSchema>
export const Rider = model('Rider', riderSchema)
