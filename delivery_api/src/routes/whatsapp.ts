import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router, type Request } from 'express'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

type RawBodyRequest = Request & { rawBody?: Buffer }

export const whatsappRouter = Router()

whatsappRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (
    env.WHATSAPP_VERIFY_TOKEN &&
    mode === 'subscribe' &&
    typeof token === 'string' &&
    token === env.WHATSAPP_VERIFY_TOKEN &&
    typeof challenge === 'string'
  ) {
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
})

whatsappRouter.post('/', (req: RawBodyRequest, res) => {
  if (!env.WHATSAPP_ENABLED || !req.rawBody) {
    res.sendStatus(503)
    return
  }

  const signature = req.header('x-hub-signature-256')
  const expected = `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(req.rawBody)
    .digest('hex')}`
  const signatureValid =
    typeof signature === 'string' &&
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  if (!signatureValid) {
    res.sendStatus(401)
    return
  }

  const body = req.body as {
    object?: string
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{ id?: string; from?: string; type?: string }>
          statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>
        }
      }>
    }>
  }

  if (body.object !== 'whatsapp_business_account') {
    res.sendStatus(404)
    return
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        logger.info(
          {
            messageId: message.id,
            senderSuffix: message.from?.slice(-4),
            messageType: message.type
          },
          'WhatsApp inbound message received'
        )
      }
      for (const status of change.value?.statuses ?? []) {
        logger.info(
          {
            messageId: status.id,
            deliveryStatus: status.status,
            recipientSuffix: status.recipient_id?.slice(-4)
          },
          'WhatsApp delivery status received'
        )
      }
    }
  }

  res.sendStatus(200)
})
