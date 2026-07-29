import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router, type Request } from 'express'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { WhatsAppConnection } from '../models/index.js'
import { processWhatsAppBotMessage } from '../services/whatsapp.bot.js'
import {
  persistInboundWhatsAppMessage,
  updateWhatsAppDeliveryStatus
} from '../services/whatsapp.gateway.js'

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

  const body = req.body as Record<string, any>

  if (body.object !== 'whatsapp_business_account') {
    res.sendStatus(404)
    return
  }

  void persistWhatsAppWebhook(body)
    .then(botJobs => {
      res.sendStatus(200)
      for (const job of botJobs) {
        void processWhatsAppBotMessage(job.conversationId, job.message).catch(error => {
          logger.error(
            { error, conversationId: job.conversationId },
            'WhatsApp bot processing failed'
          )
        })
      }
    })
    .catch(error => {
      logger.error({ error }, 'WhatsApp webhook persistence failed')
      res.sendStatus(500)
    })
})

function inboundText(message: Record<string, any>): string {
  if (message.type === 'text') return String(message.text?.body ?? '')
  if (message.type === 'interactive') {
    return String(
      message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        ''
    )
  }
  if (message.type === 'location') {
    return String(message.location?.name ?? message.location?.address ?? 'Shared location')
  }
  return ''
}

function interactiveId(message: Record<string, any>): string | undefined {
  if (message.type !== 'interactive') return undefined
  return (
    message.interactive?.button_reply?.id ??
    message.interactive?.list_reply?.id
  )
}

export async function persistWhatsAppWebhook(body: Record<string, any>) {
  const botJobs: Array<{
    conversationId: string
    message: {
      type: string
      text?: string
      interactiveId?: string
      latitude?: number
      longitude?: number
    }
  }> = []
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {}
      const phoneNumberId = value.metadata?.phone_number_id
      const connection =
        typeof phoneNumberId === 'string'
          ? await WhatsAppConnection.findOne({
              phoneNumberId,
              isActive: true
            })
          : null

      for (const status of value.statuses ?? []) {
        const errors = (status.errors ?? []).map((error: any) => ({
          code: error.code,
          title: error.title,
          message: error.message,
          details: error.error_data?.details
        }))
        if (status.id) {
          await updateWhatsAppDeliveryStatus({
            metaMessageId: status.id,
            status: status.status,
            error: errors.length ? JSON.stringify(errors) : undefined
          })
        }
        logger.info(
          {
            messageId: status.id,
            deliveryStatus: status.status,
            recipientSuffix: status.recipient_id?.slice(-4),
            errors
          },
          'WhatsApp delivery status received'
        )
      }

      for (const message of value.messages ?? []) {
        if (!connection) {
          logger.warn(
            { phoneNumberId, messageId: message.id },
            'Inbound message has no active WhatsApp connection'
          )
          continue
        }
        if (!message.id || !message.from) continue
        const contact = (value.contacts ?? []).find(
          (candidate: any) => candidate.wa_id === message.from
        )
        const persisted = await persistInboundWhatsAppMessage({
          connectionId: connection.id,
          customerWaId: message.from,
          customerName: contact?.profile?.name,
          metaMessageId: message.id,
          type: message.type ?? 'unknown',
          text: inboundText(message),
          payload: message
        })
        logger.info(
          {
            messageId: message.id,
            connectionId: connection.id,
            restaurantId: persisted.conversation.restaurant?.toString(),
            senderSuffix: message.from.slice(-4),
            messageType: message.type,
            duplicate: persisted.duplicate
          },
          'WhatsApp inbound message received'
        )
        if (!persisted.duplicate) {
          botJobs.push({
            conversationId: persisted.conversation.id,
            message: {
              type: message.type ?? 'unknown',
              text: inboundText(message),
              interactiveId: interactiveId(message),
              latitude: message.location?.latitude,
              longitude: message.location?.longitude
            }
          })
        }
      }
    }
  }
  return botJobs
}

export async function processWhatsAppWebhook(body: Record<string, any>) {
  const jobs = await persistWhatsAppWebhook(body)
  await Promise.all(
    jobs.map(job => processWhatsAppBotMessage(job.conversationId, job.message))
  )
}
