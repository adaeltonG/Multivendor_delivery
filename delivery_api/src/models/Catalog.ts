import { model, Schema } from 'mongoose'
import { polygonSchema } from './common.js'

const configurationSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    deliveryRate: { type: Number, default: 0 },
    costType: { type: String, default: 'fixed' },
    isPaidVersion: { type: Boolean, default: false },
    skipEmailVerification: { type: Boolean, default: true },
    skipMobileVerification: { type: Boolean, default: true },
    testOtp: { type: String, default: '123456' },
    termsAndConditions: { type: String, default: '' },
    privacyPolicy: { type: String, default: '' },
    email: String,
    emailName: String,
    password: { type: String, select: false },
    enableEmail: { type: Boolean, default: false },
    formEmail: String,
    sendGridApiKey: { type: String, select: false },
    sendGridEnabled: { type: Boolean, default: false },
    sendGridEmail: String,
    sendGridEmailName: String,
    sendGridPassword: { type: String, select: false },
    clientId: String,
    clientSecret: { type: String, select: false },
    sandbox: { type: Boolean, default: true },
    publishableKey: String,
    secretKey: { type: String, select: false },
    twilioAccountSid: String,
    twilioAuthToken: { type: String, select: false },
    twilioPhoneNumber: String,
    twilioEnabled: { type: Boolean, default: false },
    dashboardSentryUrl: String,
    webSentryUrl: String,
    apiSentryUrl: String,
    customerAppSentryUrl: String,
    restaurantAppSentryUrl: String,
    riderAppSentryUrl: String,
    googleApiKey: String,
    cloudinaryUploadUrl: String,
    cloudinaryApiKey: { type: String, select: false },
    webAmplitudeApiKey: String,
    appAmplitudeApiKey: String,
    webClientID: String,
    androidClientID: String,
    iOSClientID: String,
    expoClientID: String,
    googleMapLibraries: String,
    googleColor: String,
    serverUrlWeb: String,
    wsServerUrlWeb: String,
    firebaseKey: String,
    authDomain: String,
    projectId: String,
    storageBucket: String,
    msgSenderId: String,
    appId: String,
    measurementId: String,
    vapidKey: String
  },
  { timestamps: true }
)

const zoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tax: { type: Number, min: 0, default: 0 },
    location: { type: polygonSchema, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)
zoneSchema.index({ location: '2dsphere' })

const reviewSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    description: { type: String, maxlength: 1000, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

const chatMessageSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    message: { type: String, required: true, maxlength: 2000 },
    user: {
      id: { type: String, required: true },
      name: { type: String, required: true }
    }
  },
  { timestamps: true }
)

const earningSchema = new Schema(
  {
    rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
    orderId: { type: String, required: true },
    deliveryFee: { type: Number, min: 0, required: true },
    orderStatus: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    deliveryTime: { type: String, default: '' }
  },
  { timestamps: true }
)

const withdrawRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    requestAmount: { type: Number, min: 0, required: true },
    requestTime: { type: Date, default: Date.now },
    rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'TRANSFERRED', 'CANCELLED'],
      default: 'REQUESTED'
    }
  },
  { timestamps: true }
)

const simpleSchemas = {
  Cuisine: new Schema(
    {
      name: { type: String, required: true, unique: true },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      shopType: { type: String, default: 'restaurant' }
    },
    { timestamps: true }
  ),
  Coupon: new Schema(
    {
      title: { type: String, required: true, unique: true, uppercase: true },
      discount: { type: Number, min: 0, max: 100, required: true },
      enabled: { type: Boolean, default: true }
    },
    { timestamps: true }
  ),
  Banner: new Schema(
    {
      title: { type: String, required: true },
      description: String,
      action: String,
      screen: String,
      file: String,
      parameters: String
    },
    { timestamps: true }
  ),
  Offer: new Schema(
    {
      name: { type: String, required: true },
      tag: String,
      restaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }]
    },
    { timestamps: true }
  ),
  Section: new Schema(
    {
      name: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      restaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }]
    },
    { timestamps: true }
  ),
  Taxation: new Schema(
    {
      taxationCharges: { type: Number, min: 0, default: 0 },
      enabled: { type: Boolean, default: true }
    },
    { timestamps: true }
  ),
  Tipping: new Schema(
    {
      tipVariations: [{ type: Number, min: 0 }],
      enabled: { type: Boolean, default: true }
    },
    { timestamps: true }
  ),
  Counter: new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 }
  })
}

export const Configuration = model('Configuration', configurationSchema)
export const Zone = model('Zone', zoneSchema)
export const Review = model('Review', reviewSchema)
export const ChatMessage = model('ChatMessage', chatMessageSchema)
export const Earning = model('Earning', earningSchema)
export const WithdrawRequest = model('WithdrawRequest', withdrawRequestSchema)
export const Cuisine = model('Cuisine', simpleSchemas.Cuisine)
export const Coupon = model('Coupon', simpleSchemas.Coupon)
export const Banner = model('Banner', simpleSchemas.Banner)
export const Offer = model('Offer', simpleSchemas.Offer)
export const Section = model('Section', simpleSchemas.Section)
export const Taxation = model('Taxation', simpleSchemas.Taxation)
export const Tipping = model('Tipping', simpleSchemas.Tipping)
export const Counter = model('Counter', simpleSchemas.Counter)
