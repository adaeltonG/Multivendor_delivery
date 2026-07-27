import { Types } from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { logger } from '../config/logger.js'
import {
  Configuration,
  Coupon,
  Cuisine,
  Restaurant,
  Rider,
  Taxation,
  Tipping,
  User,
  Zone
} from '../models/index.js'
import { hashPassword } from '../utils/auth.js'

async function seed() {
  await connectDatabase()

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
  const vendorEmail = process.env.SEED_VENDOR_EMAIL ?? 'vendor@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const vendorPassword = process.env.SEED_VENDOR_PASSWORD
  const riderPassword = process.env.SEED_RIDER_PASSWORD

  if (!adminPassword || !vendorPassword || !riderPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD, SEED_VENDOR_PASSWORD, and SEED_RIDER_PASSWORD are required'
    )
  }

  const [admin, vendor] = await Promise.all([
    User.findOneAndUpdate(
      { email: adminEmail.toLowerCase() },
      {
        $set: {
          name: 'System Administrator',
          userType: 'ADMIN',
          isActive: true,
          password: await hashPassword(adminPassword)
        },
        $setOnInsert: { email: adminEmail.toLowerCase() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    User.findOneAndUpdate(
      { email: vendorEmail.toLowerCase() },
      {
        $set: {
          name: 'Demo Vendor',
          userType: 'VENDOR',
          isActive: true,
          password: await hashPassword(vendorPassword)
        },
        $setOnInsert: { email: vendorEmail.toLowerCase() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ])

  const zone = await Zone.findOneAndUpdate(
    { title: 'Demo Zone' },
    {
      description: 'Local development delivery zone',
      tax: 5,
      isActive: true,
      location: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.3, 51.3],
            [0.3, 51.3],
            [0.3, 51.7],
            [-0.3, 51.7],
            [-0.3, 51.3]
          ]
        ]
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const optionIds = {
    cheese: new Types.ObjectId(),
    jalapeno: new Types.ObjectId()
  }
  const addonId = new Types.ObjectId()

  const restaurant = await Restaurant.findOneAndUpdate(
    { slug: 'demo-kitchen' },
    {
      $set: {
        name: 'Demo Kitchen',
        orderPrefix: 'DK',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        logo: '',
        address: '1 Demo Street, London',
        location: { type: 'Point', coordinates: [-0.1276, 51.5072] },
        deliveryBounds: { type: 'Polygon', coordinates: zone.location.coordinates },
        owner: vendor._id,
        zone: zone._id,
        username: 'demo.restaurant',
        password: await hashPassword(vendorPassword),
        deliveryTime: 30,
        minimumOrder: 10,
        cuisines: ['Pizza', 'Fast Food'],
        isActive: true,
        isAvailable: true,
        tax: 5,
        openingTimes: [
          { day: 'MONDAY', times: [{ startTime: '09:00', endTime: '23:00' }] },
          { day: 'TUESDAY', times: [{ startTime: '09:00', endTime: '23:00' }] }
        ],
        options: [
          {
            _id: optionIds.cheese,
            title: 'Extra cheese',
            description: 'Mozzarella',
            price: 1.5
          },
          {
            _id: optionIds.jalapeno,
            title: 'Jalapeños',
            description: 'Sliced jalapeños',
            price: 0.75
          }
        ],
        addons: [
          {
            _id: addonId,
            title: 'Toppings',
            description: 'Choose extra toppings',
            options: [optionIds.cheese, optionIds.jalapeno],
            quantityMinimum: 0,
            quantityMaximum: 2
          }
        ],
        categories: [
          {
            title: 'Pizza',
            foods: [
              {
                title: 'Margherita',
                description: 'Tomato, mozzarella, and basil',
                image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
                isActive: true,
                variations: [
                  {
                    title: 'Regular',
                    price: 12,
                    discounted: 0,
                    addons: [addonId]
                  },
                  {
                    title: 'Large',
                    price: 16,
                    discounted: 0,
                    addons: [addonId]
                  }
                ]
              }
            ]
          }
        ]
      },
      $setOnInsert: { slug: 'demo-kitchen', orderId: '1' }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )

  await Promise.all([
    User.updateOne(
      { _id: vendor._id },
      { $addToSet: { restaurants: restaurant._id } }
    ),
    Rider.findOneAndUpdate(
      { username: 'demo.rider' },
      {
        name: 'Demo Rider',
        email: 'rider@example.com',
        username: 'demo.rider',
        password: await hashPassword(riderPassword),
        phone: '+440000000001',
        zone: zone._id,
        available: true,
        isActive: true,
        location: { type: 'Point', coordinates: [-0.1276, 51.5072] }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ),
    Configuration.findOneAndUpdate(
      { key: 'default' },
      {
        currency: 'GBP',
        currencySymbol: '£',
        deliveryRate: 2.5,
        costType: 'fixed',
        googleApiKey: process.env.GOOGLE_API_KEY ?? '',
        skipEmailVerification: true,
        skipMobileVerification: true,
        testOtp: '123456'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    Cuisine.updateOne(
      { name: 'Pizza' },
      {
        $setOnInsert: {
          name: 'Pizza',
          description: 'Pizza restaurants',
          shopType: 'restaurant'
        }
      },
      { upsert: true }
    ),
    Coupon.updateOne(
      { title: 'WELCOME10' },
      { $set: { discount: 10, enabled: true } },
      { upsert: true }
    ),
    Tipping.updateOne(
      {},
      { $set: { tipVariations: [5, 10, 15], enabled: true } },
      { upsert: true }
    ),
    Taxation.updateOne(
      {},
      { $set: { taxationCharges: 5, enabled: true } },
      { upsert: true }
    )
  ])

  logger.info(
    {
      adminEmail,
      vendorEmail,
      restaurantUsername: 'demo.restaurant',
      riderUsername: 'demo.rider'
    },
    'Development data seeded'
  )
}

seed()
  .then(disconnectDatabase)
  .catch(async error => {
    logger.error({ error }, 'Seed failed')
    await disconnectDatabase()
    process.exitCode = 1
  })
