import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { env } from '../config/env.js'
import { Restaurant, WhatsAppConnection } from '../models/index.js'

async function run() {
  const restaurantId = process.env.WHATSAPP_DEFAULT_RESTAURANT_ID
  if (!restaurantId) {
    throw new Error('WHATSAPP_DEFAULT_RESTAURANT_ID is required')
  }
  if (!env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is required')
  }
  await connectDatabase()
  const restaurant = await Restaurant.findById(restaurantId).select('name')
  if (!restaurant) throw new Error('WHATSAPP_DEFAULT_RESTAURANT_ID was not found')
  const connection = await WhatsAppConnection.findOneAndUpdate(
    { phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID },
    {
      $set: {
        restaurant: restaurant._id,
        whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
        displayPhoneNumber: process.env.WHATSAPP_DISPLAY_PHONE_NUMBER ?? '',
        verifiedName: process.env.WHATSAPP_VERIFIED_NAME ?? restaurant.name,
        isActive: true
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  console.log(
    JSON.stringify({
      connectionId: connection.id,
      restaurantId: restaurant.id,
      restaurant: restaurant.name,
      phoneNumberId: connection.phoneNumberId
    })
  )
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase())
