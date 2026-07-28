import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { Order, Restaurant, Rider, User } from '../models/index.js'
import { normalizeWhatsAppPhone } from '../utils/whatsapp.js'

type TemplateParameter = {
  type: 'text'
  text: string
}

type MetaErrorResponse = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  ASSIGNED: 'Driver assigned',
  PREPARING: 'Preparing',
  PICKED: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export function whatsappIsEnabled(): boolean {
  return env.WHATSAPP_ENABLED
}

async function sendTemplate(
  to: string,
  templateName: string,
  parameters: TemplateParameter[]
): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return

  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
          components: [
            {
              type: 'body',
              parameters
            }
          ]
        }
      }),
      signal: AbortSignal.timeout(10_000)
    }
  )

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as MetaErrorResponse
    throw new Error(
      `Meta WhatsApp API rejected template ${templateName}: ` +
        `${result.error?.message ?? response.statusText} (${response.status})`
    )
  }

  logger.info({ templateName, recipientSuffix: to.slice(-4) }, 'WhatsApp template sent')
}

const textParameter = (text: unknown): TemplateParameter => ({
  type: 'text',
  text: String(text ?? '').slice(0, 1024)
})

export async function notifyWhatsAppOrderCreated(orderId: string): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return

  const order = await Order.findById(orderId).lean()
  if (!order) return
  const restaurant = await Restaurant.findById(order.restaurant).lean()
  if (!restaurant) return
  const owner = await User.findById(restaurant.owner).select('name phone').lean()
  const phone = normalizeWhatsAppPhone(
    typeof owner?.phone === 'string' ? owner.phone : undefined
  )
  if (!phone) {
    logger.warn({ orderId: order.orderId }, 'Restaurant owner has no valid WhatsApp phone')
    return
  }

  await sendTemplate(phone, env.WHATSAPP_ORDER_CREATED_TEMPLATE, [
    textParameter(owner?.name || restaurant.name),
    textParameter(order.orderId),
    textParameter(order.orderAmount.toFixed(2))
  ])
}

export async function notifyWhatsAppOrderStatus(orderId: string): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return

  const order = await Order.findById(orderId).lean()
  if (!order) return
  const [customer, restaurant] = await Promise.all([
    User.findById(order.user).select('name phone isOrderNotification').lean(),
    Restaurant.findById(order.restaurant).select('name').lean()
  ])
  if (customer?.isOrderNotification === false) return
  const phone = normalizeWhatsAppPhone(
    typeof customer?.phone === 'string' ? customer.phone : undefined
  )
  if (!phone) {
    logger.warn({ orderId: order.orderId }, 'Customer has no valid WhatsApp phone')
    return
  }

  await sendTemplate(phone, env.WHATSAPP_ORDER_STATUS_TEMPLATE, [
    textParameter(customer?.name || 'Customer'),
    textParameter(order.orderId),
    textParameter(statusLabels[order.orderStatus] ?? order.orderStatus),
    textParameter(restaurant?.name || 'Zetahub restaurant')
  ])
}

export async function notifyWhatsAppRiderAssigned(orderId: string): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return

  const order = await Order.findById(orderId).lean()
  if (!order?.rider) return
  const [rider, restaurant] = await Promise.all([
    Rider.findById(order.rider).select('name phone').lean(),
    Restaurant.findById(order.restaurant).select('name address').lean()
  ])
  const phone = normalizeWhatsAppPhone(rider?.phone)
  if (!phone) {
    logger.warn({ orderId: order.orderId }, 'Rider has no valid WhatsApp phone')
    return
  }

  await sendTemplate(phone, env.WHATSAPP_RIDER_ASSIGNED_TEMPLATE, [
    textParameter(rider?.name || 'Driver'),
    textParameter(order.orderId),
    textParameter(restaurant?.name || 'Restaurant'),
    textParameter(restaurant?.address || 'See the rider app')
  ])
}

export function dispatchWhatsApp(
  operation: () => Promise<void>,
  context: Record<string, unknown>
): void {
  void operation().catch(error => {
    logger.error({ error, ...context }, 'WhatsApp notification failed')
  })
}
