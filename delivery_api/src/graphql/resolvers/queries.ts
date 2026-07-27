import { trusted, Types } from 'mongoose'
import { City } from 'country-state-city'
import {
  Banner,
  ChatMessage,
  Configuration,
  Coupon,
  Cuisine,
  Earning,
  Offer,
  Order,
  Restaurant,
  Review,
  Rider,
  Section,
  Taxation,
  Tipping,
  User,
  WithdrawRequest,
  Zone
} from '../../models/index.js'
import type { GraphQLContext } from '../context.js'
import { forbidden, notFound, unauthenticated } from '../../utils/errors.js'
import { assertCanReadOrder } from '../../services/order.service.js'

const ACTIVE_STATUSES = trusted({
  $nin: ['DELIVERED', 'COMPLETED', 'CANCELLED']
})

function dateFilter(starting?: string, ending?: string) {
  if (!starting && !ending) return {}
  return {
    createdAt: trusted({
      ...(starting ? { $gte: new Date(starting) } : {}),
      ...(ending ? { $lte: new Date(ending) } : {})
    })
  }
}

function pageValues(page = 1, rows = 20) {
  const safePage = Math.max(1, page)
  const safeRows = Math.min(100, Math.max(1, rows))
  return { page: safePage, rows: safeRows, skip: (safePage - 1) * safeRows }
}

async function nearbyRestaurants(latitude?: number, longitude?: number, shopType?: string) {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...(shopType ? { shopType } : {})
  }
  if (
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    filter.location = trusted({
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: 50_000
      }
    })
  }
  return Restaurant.find(filter).limit(100)
}

export const queryResolvers = {
  Query: {
    users: () =>
      User.find({ userType: 'CUSTOMER' }).sort({ createdAt: -1 }).limit(500).exec(),
    profile: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.user) unauthenticated()
      return User.findById(context.user.id).exec()
    },
    getCountryByIso: (_parent: unknown, { iso }: { iso: string }) => ({
      cities: (City.getCitiesOfCountry(iso.toUpperCase()) ?? []).map((city, index) => ({
        id: `${city.countryCode}-${city.stateCode}-${city.name}-${index}`,
        name: city.name,
        latitude: Number(city.latitude),
        longitude: Number(city.longitude)
      }))
    }),

    async order(_parent: unknown, { id }: { id: string }, context: GraphQLContext) {
      const order = await Order.findById(id)
      if (!order) notFound('Order')
      await assertCanReadOrder(order, context)
      return order
    },
    orderPaypal: async (_parent: unknown, args: { id: string }, context: GraphQLContext) =>
      queryResolvers.Query.order(_parent, args, context),
    orderStripe: async (_parent: unknown, args: { id: string }, context: GraphQLContext) =>
      queryResolvers.Query.order(_parent, args, context),

    orders: (_parent: unknown, { offset = 0 }: { offset?: number }, context: GraphQLContext) => {
      if (!context.user) unauthenticated()
      return Order.find({ user: context.user.id })
        .sort({ createdAt: -1 })
        .skip(Math.max(0, offset))
        .limit(20)
    },
    allOrders: (_parent: unknown, { page = 1 }: { page?: number }, context: GraphQLContext) => {
      if (context.user?.role !== 'ADMIN') forbidden()
      const pagination = pageValues(page, 20)
      return Order.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.rows)
    },
    restaurantOrders: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (context.user?.role !== 'RESTAURANT' || !context.user.restaurantId) forbidden()
      return Order.find({ restaurant: context.user.restaurantId }).sort({ createdAt: -1 }).limit(200)
    },
    riderOrders: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (context.user?.role !== 'RIDER') forbidden()
      return Order.find({
        $or: [
          { rider: context.user.riderId ?? context.user.id },
          { rider: null, orderStatus: 'ACCEPTED' }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(200)
    },
    orderCount: (_parent: unknown, { restaurant }: { restaurant: string }) =>
      Order.countDocuments({ restaurant }),
    pageCount: async (_parent: unknown, { restaurant }: { restaurant: string }) =>
      Math.ceil((await Order.countDocuments({ restaurant })) / 20),
    ordersByRestId: (
      _parent: unknown,
      args: { restaurant: string; page?: number; rows?: number; search?: string }
    ) => {
      const pagination = pageValues(args.page, args.rows)
      const filter: Record<string, unknown> = { restaurant: args.restaurant }
      if (args.search) {
        filter.orderId = trusted({ $regex: args.search, $options: 'i' })
      }
      return Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.rows)
    },
    async getOrdersByDateRange(
      _parent: unknown,
      args: { startingDate: string; endingDate: string; restaurant: string }
    ) {
      const [summary] = await Order.aggregate([
        {
          $match: {
            restaurant: new Types.ObjectId(args.restaurant),
            paymentMethod: 'COD',
            createdAt: { $gte: new Date(args.startingDate), $lte: new Date(args.endingDate) }
          }
        },
        {
          $group: {
            _id: null,
            totalAmountCashOnDelivery: { $sum: '$orderAmount' },
            countCashOnDeliveryOrders: { $sum: 1 }
          }
        }
      ])
      return summary ?? {
        totalAmountCashOnDelivery: 0,
        countCashOnDeliveryOrders: 0
      }
    },
    getActiveOrders: (
      _parent: unknown,
      { restaurantId }: { restaurantId?: string }
    ) =>
      Order.find({
        ...(restaurantId ? { restaurant: restaurantId } : {}),
        orderStatus: ACTIVE_STATUSES
      }).sort({ createdAt: -1 }),
    async getActiveOrdersWithPagination(
      _parent: unknown,
      args: { page?: number; rowsPerPage?: number; search?: string; restaurantId?: string }
    ) {
      const pagination = pageValues(args.page, args.rowsPerPage)
      const filter: Record<string, unknown> = {
        orderStatus: ACTIVE_STATUSES,
        ...(args.restaurantId ? { restaurant: args.restaurantId } : {}),
        ...(args.search
          ? { orderId: trusted({ $regex: args.search, $options: 'i' }) }
          : {})
      }
      const [orders, orderCount] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.rows),
        Order.countDocuments(filter)
      ])
      return { orders, orderCount, page: pagination.page, rowsPerPage: pagination.rows }
    },

    restaurant: (_parent: unknown, args: { id?: string; slug?: string }) =>
      Restaurant.findOne(args.id ? { _id: args.id } : { slug: args.slug }).exec(),
    restaurantList: () =>
      Restaurant.find({ isActive: true }).select('name address').exec(),
    restaurants: () => Restaurant.find().sort({ createdAt: -1 }).exec(),
    restaurantByOwner: (_parent: unknown, { id }: { id?: string }, context: GraphQLContext) =>
      User.findById(id ?? context.user?.id).populate('restaurants'),
    async nearByRestaurants(
      _parent: unknown,
      args: { latitude?: number; longitude?: number; shopType?: string }
    ) {
      const [restaurants, offers, sections] = await Promise.all([
        nearbyRestaurants(args.latitude, args.longitude, args.shopType),
        Offer.find(),
        Section.find({ enabled: true })
      ])
      return { restaurants, offers, sections }
    },
    async nearByRestaurantsPreview(
      _parent: unknown,
      args: { latitude?: number; longitude?: number; shopType?: string }
    ) {
      const [restaurants, offers, sections] = await Promise.all([
        nearbyRestaurants(args.latitude, args.longitude, args.shopType),
        Offer.find(),
        Section.find({ enabled: true })
      ])
      return { restaurants, offers, sections }
    },
    topRatedVendorsPreview: () =>
      Restaurant.find({ isActive: true }).sort({ rating: -1, reviewCount: -1 }).limit(20),
    async recentOrderRestaurantsPreview(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) {
      if (!context.user) return []
      const ids = await Order.find({ user: context.user.id })
        .sort({ createdAt: -1 })
        .distinct('restaurant')
      return Restaurant.find({ _id: trusted({ $in: ids }) }).limit(20)
    },
    async mostOrderedRestaurantsPreview() {
      const values = await Order.aggregate([
        { $group: { _id: '$restaurant', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
      return Restaurant.find({
        _id: trusted({ $in: values.map(value => value._id) })
      })
    },
    async relatedItems(
      _parent: unknown,
      { itemId, restaurantId }: { itemId: string; restaurantId: string }
    ) {
      const restaurant = await Restaurant.findById(restaurantId)
      if (!restaurant) return []
      const category = restaurant.categories.find(value =>
        value.foods.some(food => food._id.equals(itemId))
      )
      return category?.foods.filter(food => !food._id.equals(itemId)).map(food => food.id) ?? []
    },
    async popularItems(_parent: unknown, { restaurantId }: { restaurantId: string }) {
      return Order.aggregate([
        { $match: { restaurant: new Types.ObjectId(restaurantId) } },
        { $unwind: '$items' },
        { $group: { _id: '$items.food', count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, id: '$_id', count: 1 } }
      ])
    },
    cuisines: () => Cuisine.find().sort({ name: 1 }),
    rider: (_parent: unknown, { id }: { id?: string }, context: GraphQLContext) =>
      Rider.findById(id ?? context.user?.riderId ?? context.user?.id),
    riders: () => Rider.find().sort({ createdAt: -1 }),
    availableRiders: () => Rider.find({ available: true, isActive: true }),
    ridersByZone: (_parent: unknown, { id }: { id: string }) =>
      Rider.find({ zone: id, isActive: true }),
    riderEarnings: (
      _parent: unknown,
      { id, offset = 0 }: { id?: string; offset?: number },
      context: GraphQLContext
    ) =>
      Earning.find({ rider: id ?? context.user?.riderId ?? context.user?.id })
        .sort({ createdAt: -1 })
        .skip(Math.max(0, offset))
        .limit(20),
    riderWithdrawRequests: (
      _parent: unknown,
      { id, offset = 0 }: { id?: string; offset?: number },
      context: GraphQLContext
    ) =>
      WithdrawRequest.find({ rider: id ?? context.user?.riderId ?? context.user?.id })
        .sort({ createdAt: -1 })
        .skip(Math.max(0, offset))
        .limit(20),
    async getAllWithdrawRequests(
      _parent: unknown,
      args: { offset?: number; page?: number; rowsPerPage?: number; search?: string }
    ) {
      const pagination = pageValues(args.page, args.rowsPerPage)
      const filter = args.search
        ? { requestId: trusted({ $regex: args.search, $options: 'i' }) }
        : {}
      const [data, total] = await Promise.all([
        WithdrawRequest.find(filter)
          .sort({ createdAt: -1 })
          .skip(args.offset ?? pagination.skip)
          .limit(pagination.rows),
        WithdrawRequest.countDocuments(filter)
      ])
      return { success: true, message: 'Withdraw requests loaded', data, pagination: { total } }
    },
    taxes: () => Taxation.find(),
    tips: () => Tipping.find(),
    async userFavourite(_parent: unknown, _args: unknown, context: GraphQLContext) {
      if (!context.user) return []
      const user = await User.findById(context.user.id).populate('favourite')
      return user?.favourite ?? []
    },
    chat: (_parent: unknown, { order }: { order: string }) =>
      ChatMessage.find({ order }).sort({ createdAt: 1 }),
    configuration: () =>
      Configuration.findOneAndUpdate(
        { key: 'default' },
        { $setOnInsert: { key: 'default' } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ),
    lastOrderCreds: () => ({
      riderUsername: '',
      riderPassword: '',
      restaurantUsername: '',
      restaurantPassword: ''
    }),
    zones: () => Zone.find().sort({ createdAt: -1 }),
    vendors: () => User.find({ userType: 'VENDOR' }).populate('restaurants'),
    getVendor: (_parent: unknown, { id }: { id: string }) =>
      User.findById(id).populate('restaurants'),
    async coupons(
      _parent: unknown,
      args: { page?: number; rowsPerPage?: number; search?: string }
    ) {
      const pagination = pageValues(args.page, args.rowsPerPage)
      const filter = args.search
        ? { title: trusted({ $regex: args.search, $options: 'i' }) }
        : {}
      const [coupons, totalCount] = await Promise.all([
        Coupon.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.rows),
        Coupon.countDocuments(filter)
      ])
      return { coupons, totalCount }
    },
    banners: () => Banner.find().sort({ createdAt: -1 }),
    bannerActions: () => ['OPEN_RESTAURANT', 'OPEN_SCREEN', 'OPEN_URL'],
    async addons() {
      const restaurants = await Restaurant.find({ isActive: true }).select('addons options').lean()
      return restaurants.flatMap(restaurant =>
        restaurant.addons.map(addon => ({
          ...addon,
          options: restaurant.options.filter(option =>
            addon.options.some(id => id.equals(option._id))
          )
        }))
      )
    },
    async options() {
      const restaurants = await Restaurant.find({ isActive: true }).select('options').lean()
      return restaurants.flatMap(restaurant => restaurant.options)
    },
    getPaymentStatuses: () => ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    offers: () => Offer.find().populate('restaurants'),
    sections: () => Section.find().populate('restaurants').exec(),
    reviews: (_parent: unknown, { restaurant }: { restaurant: string }) =>
      Review.find({ restaurant, isActive: true }).sort({ createdAt: -1 }),

    async getDashboardTotal(
      _parent: unknown,
      args: { starting_date?: string; ending_date?: string; restaurant: string }
    ) {
      const [result] = await Order.aggregate([
        {
          $match: {
            restaurant: new Types.ObjectId(args.restaurant),
            ...dateFilter(args.starting_date, args.ending_date)
          }
        },
        { $group: { _id: null, totalOrders: { $sum: 1 }, totalSales: { $sum: '$orderAmount' } } }
      ])
      return result ?? { totalOrders: 0, totalSales: 0 }
    },
    async getDashboardSales(
      _parent: unknown,
      args: { starting_date?: string; ending_date?: string; restaurant: string }
    ) {
      const orders = await Order.aggregate([
        {
          $match: {
            restaurant: new Types.ObjectId(args.restaurant),
            ...dateFilter(args.starting_date, args.ending_date)
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: '$orderAmount' }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, day: '$_id', amount: 1 } }
      ])
      return { orders }
    },
    async getDashboardOrders(
      _parent: unknown,
      args: { starting_date?: string; ending_date?: string; restaurant: string }
    ) {
      const orders = await Order.aggregate([
        {
          $match: {
            restaurant: new Types.ObjectId(args.restaurant),
            ...dateFilter(args.starting_date, args.ending_date)
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, day: '$_id', count: 1 } }
      ])
      return { orders }
    },
    async getDashboardData(
      _parent: unknown,
      args: { starting_date?: string; ending_date?: string }
    ) {
      const filter = dateFilter(args.starting_date, args.ending_date)
      const [totalUsers, data, orders] = await Promise.all([
        User.countDocuments({ userType: 'CUSTOMER' }),
        Order.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSales: { $sum: '$orderAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: filter },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
              amount: { $sum: '$orderAmount' }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, day: '$_id', count: 1, amount: 1 } }
        ])
      ])
      return {
        totalUsers,
        totalOrders: data[0]?.totalOrders ?? 0,
        totalSales: data[0]?.totalSales ?? 0,
        orders
      }
    }
  }
}
