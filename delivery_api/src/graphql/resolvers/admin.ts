import {
  Banner,
  Configuration,
  Coupon,
  Cuisine,
  Offer,
  Restaurant,
  Rider,
  Section,
  Taxation,
  Tipping,
  User,
  WithdrawRequest,
  Zone
} from '../../models/index.js'
import type { GraphQLContext } from '../context.js'
import { comparePassword, hashPassword } from '../../utils/auth.js'
import { badUserInput, forbidden, notFound } from '../../utils/errors.js'

function manager(context: GraphQLContext) {
  if (!context.user || !['ADMIN', 'VENDOR'].includes(context.user.role)) forbidden()
  return context.user
}

function admin(context: GraphQLContext) {
  if (context.user?.role !== 'ADMIN') forbidden()
}

async function restaurantDocument(id: string) {
  const restaurant = await Restaurant.findById(id)
  if (!restaurant) notFound('Restaurant')
  return restaurant
}

async function configurationUpdate(input: Record<string, unknown>, context: GraphQLContext) {
  admin(context)
  return Configuration.findOneAndUpdate(
    { key: 'default' },
    { $set: input, $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const adminResolvers = {
  Mutation: {
    async createFood(
      _parent: unknown,
      { foodInput }: { foodInput: Record<string, any> },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(foodInput.restaurant)
      const category = restaurant.categories.id(foodInput.category)
      if (!category) notFound('Category')
      category.foods.push({
        title: foodInput.title,
        description: foodInput.description ?? '',
        image: foodInput.image ?? '',
        variations: foodInput.variations
      })
      await restaurant.save()
      return restaurant
    },
    async editFood(
      _parent: unknown,
      { foodInput }: { foodInput: Record<string, any> },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(foodInput.restaurant)
      const category = restaurant.categories.id(foodInput.category)
      const food = category?.foods.id(foodInput._id)
      if (!food) notFound('Food')
      food.set({
        title: foodInput.title,
        description: foodInput.description ?? '',
        image: foodInput.image ?? food.image,
        variations: foodInput.variations
      })
      await restaurant.save()
      return restaurant
    },
    async deleteFood(
      _parent: unknown,
      args: { id: string; restaurant: string; categoryId: string },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(args.restaurant)
      const category = restaurant.categories.id(args.categoryId)
      if (!category?.foods.id(args.id)) notFound('Food')
      category.foods.pull({ _id: args.id })
      await restaurant.save()
      return restaurant
    },
    async createCategory(
      _parent: unknown,
      { category }: { category?: Record<string, string> },
      context: GraphQLContext
    ) {
      manager(context)
      if (!category) badUserInput('Category is required')
      const restaurant = await restaurantDocument(category.restaurant!)
      restaurant.categories.push({ title: category.title!, foods: [] })
      await restaurant.save()
      return restaurant
    },
    async editCategory(
      _parent: unknown,
      { category }: { category?: Record<string, string> },
      context: GraphQLContext
    ) {
      manager(context)
      if (!category?._id) badUserInput('Category ID is required')
      const restaurant = await restaurantDocument(category.restaurant!)
      const item = restaurant.categories.id(category._id)
      if (!item) notFound('Category')
      item.title = category.title!
      await restaurant.save()
      return restaurant
    },
    async deleteCategory(
      _parent: unknown,
      args: { id: string; restaurant: string },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(args.restaurant)
      if (!restaurant.categories.id(args.id)) notFound('Category')
      restaurant.categories.pull({ _id: args.id })
      await restaurant.save()
      return restaurant
    },
    async createOptions(
      _parent: unknown,
      { optionInput }: { optionInput?: { restaurant: string; options: Record<string, unknown>[] } },
      context: GraphQLContext
    ) {
      manager(context)
      if (!optionInput) badUserInput('Option input is required')
      const restaurant = await restaurantDocument(optionInput.restaurant)
      restaurant.options.push(...(optionInput.options as never[]))
      await restaurant.save()
      return restaurant
    },
    async editOption(
      _parent: unknown,
      { optionInput }: { optionInput?: { restaurant: string; options: Record<string, any> } },
      context: GraphQLContext
    ) {
      manager(context)
      if (!optionInput) badUserInput('Option input is required')
      const restaurant = await restaurantDocument(optionInput.restaurant)
      const option = restaurant.options.id(optionInput.options._id)
      if (!option) notFound('Option')
      option.set(optionInput.options)
      await restaurant.save()
      return restaurant
    },
    async deleteOption(
      _parent: unknown,
      args: { id: string; restaurant: string },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(args.restaurant)
      restaurant.options.pull({ _id: args.id })
      restaurant.addons.forEach(addon => {
        addon.options = addon.options.filter(value => !value.equals(args.id))
      })
      await restaurant.save()
      return restaurant
    },
    async createAddons(
      _parent: unknown,
      { addonInput }: { addonInput?: { restaurant: string; addons: Record<string, unknown>[] } },
      context: GraphQLContext
    ) {
      manager(context)
      if (!addonInput) badUserInput('Add-on input is required')
      const restaurant = await restaurantDocument(addonInput.restaurant)
      restaurant.addons.push(...(addonInput.addons as never[]))
      await restaurant.save()
      return restaurant
    },
    async editAddon(
      _parent: unknown,
      { addonInput }: { addonInput?: { restaurant: string; addons: Record<string, any> } },
      context: GraphQLContext
    ) {
      manager(context)
      if (!addonInput) badUserInput('Add-on input is required')
      const restaurant = await restaurantDocument(addonInput.restaurant)
      const addon = restaurant.addons.id(addonInput.addons._id)
      if (!addon) notFound('Add-on')
      addon.set(addonInput.addons)
      await restaurant.save()
      return restaurant
    },
    async deleteAddon(
      _parent: unknown,
      args: { id: string; restaurant: string },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await restaurantDocument(args.restaurant)
      restaurant.addons.pull({ _id: args.id })
      restaurant.categories.forEach(category => {
        category.foods.forEach(food => {
          food.variations.forEach(variation => {
            variation.addons = variation.addons.filter(value => !value.equals(args.id))
          })
        })
      })
      await restaurant.save()
      return restaurant
    },

    async createRider(
      _parent: unknown,
      { riderInput }: { riderInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      if (!riderInput.password) badUserInput('Rider password is required')
      return Rider.create({
        ...riderInput,
        _id: undefined,
        password: await hashPassword(riderInput.password),
        location: { type: 'Point', coordinates: [0, 0] }
      })
    },
    async editRider(
      _parent: unknown,
      { riderInput }: { riderInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, password, ...updates } = riderInput
      if (password) updates.password = await hashPassword(password)
      const rider = await Rider.findByIdAndUpdate(_id, updates, {
        new: true,
        runValidators: true
      })
      if (!rider) notFound('Rider')
      return rider
    },
    async deleteRider(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      admin(context)
      const rider = await Rider.findByIdAndUpdate(id, { isActive: false }, { new: true })
      if (!rider) notFound('Rider')
      return rider
    },
    async createVendor(
      _parent: unknown,
      { vendorInput }: { vendorInput?: Record<string, string> },
      context: GraphQLContext
    ) {
      admin(context)
      if (!vendorInput?.email || !vendorInput.password) {
        badUserInput('Vendor email and password are required')
      }
      const email = vendorInput.email
      return User.create({
        email,
        name: email.split('@')[0],
        password: await hashPassword(vendorInput.password),
        userType: 'VENDOR'
      })
    },
    async editVendor(
      _parent: unknown,
      { vendorInput }: { vendorInput?: Record<string, string> },
      context: GraphQLContext
    ) {
      admin(context)
      if (!vendorInput?._id || !vendorInput.email) {
        badUserInput('Vendor ID and email are required')
      }
      const updates: Record<string, string> = { email: vendorInput.email.toLowerCase() }
      if (vendorInput.password) updates.password = await hashPassword(vendorInput.password)
      const vendor = await User.findByIdAndUpdate(vendorInput._id, updates, { new: true })
      if (!vendor) notFound('Vendor')
      return vendor
    },
    async deleteVendor(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      admin(context)
      const result = await User.updateOne({ _id: id, userType: 'VENDOR' }, { isActive: false })
      return result.matchedCount > 0
    },
    async createRestaurant(
      _parent: unknown,
      args: { restaurant: Record<string, any>; owner: string },
      context: GraphQLContext
    ) {
      admin(context)
      const owner = await User.findOne({ _id: args.owner, userType: { $in: ['VENDOR', 'ADMIN'] } })
      if (!owner) notFound('Vendor')
      let slug = slugify(args.restaurant.name)
      if (await Restaurant.exists({ slug })) slug = `${slug}-${Date.now()}`
      const restaurant = await Restaurant.create({
        ...args.restaurant,
        slug,
        owner: owner._id,
        password: await hashPassword(args.restaurant.password),
        location: { type: 'Point', coordinates: [0, 0] }
      })
      owner.restaurants.push(restaurant._id)
      await owner.save()
      return restaurant
    },
    async editRestaurant(
      _parent: unknown,
      { restaurant }: { restaurant: Record<string, any> },
      context: GraphQLContext
    ) {
      manager(context)
      const { _id, password, salesTax, ...updates } = restaurant
      if (password) updates.password = await hashPassword(password)
      if (salesTax !== undefined) updates.tax = salesTax
      const record = await Restaurant.findByIdAndUpdate(_id, updates, {
        new: true,
        runValidators: true
      })
      if (!record) notFound('Restaurant')
      return record
    },
    async deleteRestaurant(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      admin(context)
      const restaurant = await Restaurant.findByIdAndUpdate(id, { isActive: false }, { new: true })
      if (!restaurant) notFound('Restaurant')
      return restaurant
    },
    async updateTimings(
      _parent: unknown,
      args: { id: string; openingTimes?: unknown[] },
      context: GraphQLContext
    ) {
      manager(context)
      const restaurant = await Restaurant.findByIdAndUpdate(
        args.id,
        { openingTimes: args.openingTimes ?? [] },
        { new: true, runValidators: true }
      )
      if (!restaurant) notFound('Restaurant')
      return restaurant
    },
    async updateCommission(
      _parent: unknown,
      args: { id: string; commissionRate: number },
      context: GraphQLContext
    ) {
      admin(context)
      const restaurant = await Restaurant.findByIdAndUpdate(
        args.id,
        { commissionRate: args.commissionRate },
        { new: true, runValidators: true }
      )
      if (!restaurant) notFound('Restaurant')
      return restaurant
    },
    async updateDeliveryBoundsAndLocation(
      _parent: unknown,
      args: Record<string, any>,
      context: GraphQLContext
    ) {
      manager(context)
      const coordinates = args.location.coordinates ?? [
        args.location.longitude,
        args.location.latitude
      ]
      const updates: Record<string, unknown> = {
        boundType: args.boundType,
        location: { type: 'Point', coordinates },
        address: args.address,
        postCode: args.postCode,
        city: args.city
      }
      if (args.boundType === 'circle' && args.circleBounds) {
        updates.circleBounds = {
          center: {
            type: 'Point',
            coordinates: [args.circleBounds.longitude, args.circleBounds.latitude]
          },
          radius: args.circleBounds.radius
        }
      } else if (args.bounds) {
        updates.deliveryBounds = { type: 'Polygon', coordinates: args.bounds }
      }
      const data = await Restaurant.findByIdAndUpdate(args.id, updates, {
        new: true,
        runValidators: true
      })
      if (!data) notFound('Restaurant')
      return { success: true, message: 'Delivery area updated', data }
    },

    async createZone(
      _parent: unknown,
      { zone }: { zone: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      return Zone.create({
        title: zone.title,
        description: zone.description,
        location: { type: 'Polygon', coordinates: zone.coordinates }
      })
    },
    async editZone(
      _parent: unknown,
      { zone }: { zone: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const record = await Zone.findByIdAndUpdate(
        zone._id,
        {
          title: zone.title,
          description: zone.description,
          location: { type: 'Polygon', coordinates: zone.coordinates }
        },
        { new: true, runValidators: true }
      )
      if (!record) notFound('Zone')
      return record
    },
    async deleteZone(
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) {
      admin(context)
      const zone = await Zone.findByIdAndUpdate(id, { isActive: false }, { new: true })
      if (!zone) notFound('Zone')
      return zone
    },

    createCoupon: (
      _parent: unknown,
      { couponInput }: { couponInput: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Coupon.create(couponInput)),
    async editCoupon(
      _parent: unknown,
      { couponInput }: { couponInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = couponInput
      const record = await Coupon.findByIdAndUpdate(_id, updates, { new: true, runValidators: true })
      if (!record) notFound('Coupon')
      return record
    },
    deleteCoupon: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      admin(context)
      return Boolean(await Coupon.findByIdAndDelete(id))
    },
    createCuisine: (
      _parent: unknown,
      { cuisineInput }: { cuisineInput: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Cuisine.create(cuisineInput)),
    async editCuisine(
      _parent: unknown,
      { cuisineInput }: { cuisineInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = cuisineInput
      const record = await Cuisine.findByIdAndUpdate(_id, updates, { new: true, runValidators: true })
      if (!record) notFound('Cuisine')
      return record
    },
    deleteCuisine: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      admin(context)
      return Boolean(await Cuisine.findByIdAndDelete(id))
    },
    createBanner: (
      _parent: unknown,
      { bannerInput }: { bannerInput: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Banner.create(bannerInput)),
    async editBanner(
      _parent: unknown,
      { bannerInput }: { bannerInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = bannerInput
      const record = await Banner.findByIdAndUpdate(_id, updates, { new: true, runValidators: true })
      if (!record) notFound('Banner')
      return record
    },
    deleteBanner: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      admin(context)
      return Boolean(await Banner.findByIdAndDelete(id))
    },
    createOffer: (
      _parent: unknown,
      { offer }: { offer: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Offer.create(offer)),
    async editOffer(
      _parent: unknown,
      { offer }: { offer: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = offer
      const record = await Offer.findByIdAndUpdate(_id, updates, { new: true, runValidators: true })
      if (!record) notFound('Offer')
      return record
    },
    deleteOffer: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      admin(context)
      return Boolean(await Offer.findByIdAndDelete(id))
    },
    createSection: (
      _parent: unknown,
      { section }: { section: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Section.create(section)),
    async editSection(
      _parent: unknown,
      { section }: { section: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = section
      const record = await Section.findByIdAndUpdate(_id, updates, { new: true, runValidators: true })
      if (!record) notFound('Section')
      return record
    },
    deleteSection: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      admin(context)
      return Boolean(await Section.findByIdAndDelete(id))
    },
    createTipping: (
      _parent: unknown,
      { tippingInput }: { tippingInput: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Tipping.create(tippingInput)),
    async editTipping(
      _parent: unknown,
      { tippingInput }: { tippingInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = tippingInput
      const record = await Tipping.findByIdAndUpdate(_id, updates, { new: true })
      if (!record) notFound('Tipping')
      return record
    },
    createTaxation: (
      _parent: unknown,
      { taxationInput }: { taxationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => (admin(context), Taxation.create(taxationInput)),
    async editTaxation(
      _parent: unknown,
      { taxationInput }: { taxationInput: Record<string, any> },
      context: GraphQLContext
    ) {
      admin(context)
      const { _id, ...updates } = taxationInput
      const record = await Taxation.findByIdAndUpdate(_id, updates, { new: true })
      if (!record) notFound('Taxation')
      return record
    },
    sendNotificationUser: (_p: unknown, _a: unknown, context: GraphQLContext) => {
      admin(context)
      return true
    },
    async updateWithdrawReqStatus(
      _parent: unknown,
      { id, status }: { id: string; status: string },
      context: GraphQLContext
    ) {
      admin(context)
      const request = await WithdrawRequest.findById(id)
      if (!request) notFound('Withdraw request')
      const rider = await Rider.findById(request.rider)
      if (!rider) notFound('Rider')
      if (status === 'TRANSFERRED' && request.status !== 'TRANSFERRED') {
        if (rider.currentWalletAmount < request.requestAmount) {
          badUserInput('Rider wallet balance is insufficient')
        }
        rider.currentWalletAmount -= request.requestAmount
        rider.withdrawnWalletAmount += request.requestAmount
        await rider.save()
      }
      request.status = status as typeof request.status
      await request.save()
      return {
        success: true,
        message: 'Withdraw request updated',
        data: { rider, withdrawRequest: request }
      }
    },

    saveEmailConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveFormEmailConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveSendGridConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveFirebaseConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveSentryConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveGoogleApiKeyConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveCloudinaryConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveAmplitudeApiKeyConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveGoogleClientIDConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveWebConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveAppConfigurations: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveDeliveryRateConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    savePaypalConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveStripeConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveTwilioConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveVerificationsToggle: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context),
    saveCurrencyConfiguration: (
      _p: unknown,
      { configurationInput }: { configurationInput: Record<string, unknown> },
      context: GraphQLContext
    ) => configurationUpdate(configurationInput, context)
  }
}
