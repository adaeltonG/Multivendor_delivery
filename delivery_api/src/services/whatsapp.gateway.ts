import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import {
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppMessage
} from '../models/index.js'
import { pubsub, topics } from '../graphql/pubsub.js'
import { decryptSecret } from '../utils/secret.js'

export type WhatsAppPayload = Record<string, unknown> & {
  type: string
}

type SendOptions = {
  conversationId?: string
  customerName?: string
  purpose?: 'ORDERING' | 'OPERATIONAL'
}

function previewForPayload(payload: WhatsAppPayload): string {
  if (payload.type === 'text') {
    return String((payload.text as { body?: string } | undefined)?.body ?? '')
  }
  if (payload.type === 'template') {
    return `Template: ${String((payload.template as { name?: string } | undefined)?.name ?? '')}`
  }
  if (payload.type === 'interactive') {
    return String(
      (payload.interactive as { body?: { text?: string } } | undefined)?.body?.text ??
        'Interactive message'
    )
  }
  return `[${payload.type}]`
}

function messageType(type: string): string {
  const normalized = type.toUpperCase()
  return [
    'TEXT',
    'IMAGE',
    'DOCUMENT',
    'AUDIO',
    'VIDEO',
    'LOCATION',
    'INTERACTIVE',
    'TEMPLATE'
  ].includes(normalized)
    ? normalized
    : 'UNKNOWN'
}

export async function getConnectionForSending(connectionId: string) {
  const connection = await WhatsAppConnection.findOne({
    _id: connectionId,
    isActive: true
  }).select('+accessTokenEncrypted')
  if (!connection) throw new Error('Active WhatsApp connection not found')
  const accessToken =
    (connection.accessTokenEncrypted
      ? decryptSecret(connection.accessTokenEncrypted)
      : '') ||
    (connection.phoneNumberId === env.WHATSAPP_PHONE_NUMBER_ID
      ? env.WHATSAPP_ACCESS_TOKEN
      : '')
  if (!accessToken) throw new Error('WhatsApp connection has no access token')
  return { connection, accessToken }
}

export async function ensureWhatsAppConversation(
  connectionId: string,
  customerWaId: string,
  customerName = 'WhatsApp customer',
  purpose: 'ORDERING' | 'OPERATIONAL' = 'ORDERING'
) {
  const connection = await WhatsAppConnection.findById(connectionId)
  if (!connection) throw new Error('WhatsApp connection not found')
  return WhatsAppConversation.findOneAndUpdate(
    { connection: connection._id, customerWaId, purpose },
    {
      $set: {
        ...(customerName ? { customerName } : {}),
        ...(connection.restaurant ? { restaurant: connection.restaurant } : {})
      },
      $setOnInsert: {
        status: 'BOT',
        botState: 'WELCOME',
        purpose,
        lastMessageAt: new Date()
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
}

export async function publishWhatsAppConversation(conversation: any) {
  const restaurantId = conversation.restaurant?.toString()
  if (!restaurantId) return
  await pubsub.publish(topics.whatsappConversation(restaurantId), {
    whatsappConversationUpdated: conversation
  })
}

export async function publishWhatsAppMessage(message: any) {
  const restaurantId = message.restaurant?.toString()
  if (!restaurantId) return
  await pubsub.publish(topics.whatsappMessage(restaurantId), {
    whatsappMessageAdded: message
  })
}

export async function persistInboundWhatsAppMessage(args: {
  connectionId: string
  customerWaId: string
  customerName?: string
  metaMessageId: string
  type: string
  text?: string
  payload: unknown
}) {
  const conversation = await ensureWhatsAppConversation(
    args.connectionId,
    args.customerWaId,
    args.customerName
  )
  const existing = await WhatsAppMessage.findOne({ metaMessageId: args.metaMessageId })
  if (existing) return { conversation, message: existing, duplicate: true }

  const now = new Date()
  const message = await WhatsAppMessage.create({
    conversation: conversation._id,
    restaurant: conversation.restaurant,
    connection: conversation.connection,
    metaMessageId: args.metaMessageId,
    direction: 'INBOUND',
    type: messageType(args.type),
    text: args.text ?? '',
    payload: args.payload,
    status: 'RECEIVED'
  })
  conversation.lastMessagePreview = (args.text || `[${args.type}]`).slice(0, 240)
  conversation.lastMessageAt = now
  conversation.lastInboundAt = now
  conversation.unreadCount += 1
  await conversation.save()
  await Promise.all([
    publishWhatsAppMessage(message),
    publishWhatsAppConversation(conversation)
  ])
  return { conversation, message, duplicate: false }
}

export async function sendWhatsAppPayload(
  connectionId: string,
  to: string,
  payload: WhatsAppPayload,
  options: SendOptions = {}
) {
  const { connection, accessToken } = await getConnectionForSending(connectionId)
  const conversation = options.conversationId
    ? await WhatsAppConversation.findById(options.conversationId)
    : await ensureWhatsAppConversation(
        connection.id,
        to,
        options.customerName,
        options.purpose
      )
  if (!conversation) throw new Error('WhatsApp conversation not found')

  const text = previewForPayload(payload)
  const message = await WhatsAppMessage.create({
    conversation: conversation._id,
    restaurant: conversation.restaurant,
    connection: connection._id,
    direction: 'OUTBOUND',
    type: messageType(payload.type),
    text,
    payload,
    status: 'QUEUED'
  })

  let response: Response
  try {
    response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          ...payload
        }),
        signal: AbortSignal.timeout(10_000)
      }
    )
  } catch (error) {
    message.status = 'FAILED'
    message.error = error instanceof Error ? error.message : 'WhatsApp request failed'
    await message.save()
    await publishWhatsAppMessage(message)
    throw error
  }
  const result = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>
    error?: { message?: string }
  }
  if (!response.ok) {
    const error = new Error(
      `Meta WhatsApp API rejected ${payload.type} message: ${
        result.error?.message ?? response.statusText
      } (${response.status})`
    )
    message.status = 'FAILED'
    message.error = error.message
    await message.save()
    await publishWhatsAppMessage(message)
    throw error
  }

  const now = new Date()
  message.metaMessageId = result.messages?.[0]?.id
  message.status = 'SENT'
  await message.save()
  conversation.lastMessagePreview = text.slice(0, 240)
  conversation.lastMessageAt = now
  conversation.lastOutboundAt = now
  await conversation.save()
  await Promise.all([
    publishWhatsAppMessage(message),
    publishWhatsAppConversation(conversation)
  ])
  return message
}

export const sendWhatsAppText = (
  connectionId: string,
  to: string,
  text: string,
  options?: SendOptions
) =>
  sendWhatsAppPayload(
    connectionId,
    to,
    { type: 'text', text: { body: text.slice(0, 4096), preview_url: false } },
    options
  )

export const sendWhatsAppReplyButtons = (
  connectionId: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  options?: SendOptions
) =>
  sendWhatsAppPayload(
    connectionId,
    to,
    {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText.slice(0, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map(button => ({
            type: 'reply',
            reply: { id: button.id.slice(0, 256), title: button.title.slice(0, 20) }
          }))
        }
      }
    },
    options
  )

export const sendWhatsAppList = (
  connectionId: string,
  to: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>,
  options?: SendOptions
) =>
  sendWhatsAppPayload(
    connectionId,
    to,
    {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText.slice(0, 1024) },
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.slice(0, 10).map(section => ({
            title: section.title.slice(0, 24),
            rows: section.rows.slice(0, 10).map(row => ({
              id: row.id.slice(0, 200),
              title: row.title.slice(0, 24),
              description: row.description?.slice(0, 72)
            }))
          }))
        }
      }
    },
    options
  )

export async function updateWhatsAppDeliveryStatus(args: {
  metaMessageId: string
  status: string
  error?: string
}) {
  const statusMap: Record<string, string> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED'
  }
  const message = await WhatsAppMessage.findOneAndUpdate(
    { metaMessageId: args.metaMessageId },
    {
      $set: {
        status: statusMap[args.status] ?? 'SENT',
        ...(args.error ? { error: args.error } : {})
      }
    },
    { new: true }
  )
  if (message) await publishWhatsAppMessage(message)
  else logger.debug({ metaMessageId: args.metaMessageId }, 'Untracked WhatsApp status')
}
