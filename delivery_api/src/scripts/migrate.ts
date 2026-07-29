import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { logger } from '../config/logger.js'
import {
  Restaurant,
  Rider,
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppMessage,
  Zone
} from '../models/index.js'

async function migrate() {
  await connectDatabase()

  const zones = await Zone.collection.updateMany(
    {
      $or: [
        { title: { $exists: false } },
        { title: null },
        { title: '' }
      ]
    },
    [
      {
        $set: {
          title: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: '$name' }, 'string'] },
                  { $ne: ['$name', ''] }
                ]
              },
              '$name',
              { $concat: ['Zone ', { $toString: '$_id' }] }
            ]
          }
        }
      }
    ]
  )

  logger.info(
    {
      matchedZones: zones.matchedCount,
      updatedZones: zones.modifiedCount
    },
    'Legacy data migration completed'
  )

  await Promise.all([
    Restaurant.createIndexes(),
    Rider.createIndexes(),
    Zone.createIndexes(),
    WhatsAppConnection.createIndexes(),
    WhatsAppConversation.createIndexes(),
    WhatsAppMessage.createIndexes()
  ])

  logger.info(
    {
      models: [
        'Restaurant',
        'Rider',
        'Zone',
        'WhatsAppConnection',
        'WhatsAppConversation',
        'WhatsAppMessage'
      ]
    },
    'Production database indexes created'
  )
}

migrate()
  .then(disconnectDatabase)
  .catch(async error => {
    logger.error({ error }, 'Migration failed')
    await disconnectDatabase()
    process.exitCode = 1
  })
