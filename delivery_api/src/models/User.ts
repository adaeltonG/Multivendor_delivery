import { model, Schema, type InferSchemaType } from 'mongoose'
import { addressSchema } from './common.js'

export const USER_ROLES = ['CUSTOMER', 'VENDOR', 'ADMIN'] as const

const userSchema = new Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true
    },
    phone: { type: String, trim: true, unique: true, sparse: true, index: true },
    password: { type: String, select: false },
    appleId: { type: String, sparse: true, unique: true, select: false },
    userType: { type: String, enum: USER_ROLES, default: 'CUSTOMER', index: true },
    phoneIsVerified: { type: Boolean, default: false },
    emailIsVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isOrderNotification: { type: Boolean, default: true },
    isOfferNotification: { type: Boolean, default: true },
    notificationToken: { type: String, default: '' },
    pushToken: { type: String, default: '' },
    addresses: { type: [addressSchema], default: [] },
    favourite: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    restaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password
        delete ret.appleId
        return ret
      }
    }
  }
)

userSchema.index({ userType: 1, createdAt: -1 })

export type UserDocument = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
