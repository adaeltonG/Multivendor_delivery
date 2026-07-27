import { model, Schema, type InferSchemaType } from 'mongoose'
import { pointSchema, polygonSchema } from './common.js'

const variationSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    price: { type: Number, required: true, min: 0 },
    discounted: { type: Number, min: 0, default: 0 },
    addons: [{ type: Schema.Types.ObjectId }]
  },
  { timestamps: true }
)

const foodSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
    variations: { type: [variationSchema], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

const categorySchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    foods: { type: [foodSchema], default: [] }
  },
  { timestamps: true }
)

const optionSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
)

const addonSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    options: [{ type: Schema.Types.ObjectId }],
    quantityMinimum: { type: Number, min: 0, default: 0 },
    quantityMaximum: { type: Number, min: 1, default: 1 }
  },
  { timestamps: true }
)

const timeRangeSchema = new Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
)

const openingTimeSchema = new Schema(
  {
    day: { type: String, required: true },
    times: { type: [timeRangeSchema], default: [] }
  },
  { _id: false }
)

const restaurantSchema = new Schema(
  {
    orderId: { type: String, index: true },
    orderPrefix: { type: String, trim: true, default: 'EN' },
    name: { type: String, trim: true, required: true, index: true },
    slug: { type: String, trim: true, lowercase: true, unique: true, index: true },
    image: { type: String, default: '' },
    logo: { type: String, default: '' },
    address: { type: String, trim: true, required: true },
    postCode: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    location: { type: pointSchema, required: true, default: () => ({}) },
    deliveryBounds: { type: polygonSchema, default: () => ({}) },
    boundType: { type: String, enum: ['polygon', 'circle'], default: 'polygon' },
    circleBounds: {
      center: { type: pointSchema },
      radius: { type: Number, min: 0 }
    },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', index: true },
    username: { type: String, trim: true, lowercase: true, unique: true, select: false },
    password: { type: String, required: true, select: false },
    deliveryTime: { type: Number, min: 0, default: 30 },
    minimumOrder: { type: Number, min: 0, default: 0 },
    categories: { type: [categorySchema], default: [] },
    options: { type: [optionSchema], default: [] },
    addons: { type: [addonSchema], default: [] },
    openingTimes: { type: [openingTimeSchema], default: [] },
    sections: [{ type: Schema.Types.ObjectId, ref: 'Section' }],
    cuisines: [{ type: String }],
    keywords: [{ type: String }],
    tags: [{ type: String }],
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    stripeDetailsSubmitted: { type: Boolean, default: false },
    commissionRate: { type: Number, min: 0, max: 100, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    notificationToken: { type: String, default: '' },
    enableNotification: { type: Boolean, default: true },
    shopType: { type: String, default: 'restaurant', index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

restaurantSchema.index({ location: '2dsphere' })
restaurantSchema.index({ name: 'text', address: 'text', keywords: 'text', tags: 'text' })
restaurantSchema.index({ isActive: 1, isAvailable: 1, shopType: 1 })

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema>
export const Restaurant = model('Restaurant', restaurantSchema)
