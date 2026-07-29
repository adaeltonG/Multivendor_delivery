import { GraphQLError } from 'graphql'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { getConnectionForSending } from './whatsapp.gateway.js'
import {
  WHATSAPP_TEMPLATE_CATEGORIES,
  validateWhatsAppTemplateInput,
  type CreateWhatsAppTemplateInput,
  type WhatsAppTemplateCategory
} from './whatsapp.template-validation.js'

export type WhatsAppMessageTemplate = {
  id: string
  name: string
  status: string
  category: WhatsAppTemplateCategory
  language: string
  body: string
}

type MetaTemplate = {
  id?: string
  name?: string
  status?: string
  category?: string
  language?: string
  components?: Array<{ type?: string; text?: string }>
}

function metaApiError(operation: string, status?: number, cause?: unknown): never {
  logger.warn(
    {
      operation,
      status,
      error: cause instanceof Error ? cause.message : undefined
    },
    'Meta WhatsApp template request failed'
  )
  throw new GraphQLError(
    `WhatsApp could not ${operation} message templates. Please try again later.`,
    { extensions: { code: 'BAD_GATEWAY' } }
  )
}

function normalizeTemplate(template: MetaTemplate): WhatsAppMessageTemplate {
  const category = WHATSAPP_TEMPLATE_CATEGORIES.includes(template.category as WhatsAppTemplateCategory)
    ? (template.category as WhatsAppTemplateCategory)
    : 'UTILITY'
  return {
    id: String(template.id ?? ''),
    name: String(template.name ?? ''),
    status: String(template.status ?? 'UNKNOWN'),
    category,
    language: String(template.language ?? ''),
    body: String(
      template.components?.find(component => component.type?.toUpperCase() === 'BODY')
        ?.text ?? ''
    )
  }
}

async function templateCredentials(connectionId: string) {
  const { connection, accessToken } = await getConnectionForSending(connectionId)
  const whatsappBusinessAccountId =
    connection.whatsappBusinessAccountId || env.WHATSAPP_BUSINESS_ACCOUNT_ID
  if (!whatsappBusinessAccountId) {
    throw new GraphQLError(
      'This WhatsApp connection does not have a WhatsApp Business Account ID.',
      { extensions: { code: 'BAD_USER_INPUT' } }
    )
  }
  return { accessToken, whatsappBusinessAccountId }
}

async function metaRequest(
  connectionId: string,
  init: RequestInit = {}
): Promise<Record<string, unknown>> {
  const { accessToken, whatsappBusinessAccountId } = await templateCredentials(connectionId)
  let response: Response
  try {
    const query =
      init.method === 'POST'
        ? ''
        : '?fields=id,name,status,category,language,components&limit=100'
    response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${whatsappBusinessAccountId}/message_templates${query}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...init.headers
        },
        signal: AbortSignal.timeout(10_000)
      }
    )
  } catch (error) {
    metaApiError(init.method === 'POST' ? 'create' : 'load', undefined, error)
  }
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    metaApiError(init.method === 'POST' ? 'create' : 'load', response.status)
  }
  return result
}

export async function listWhatsAppMessageTemplates(
  connectionId: string
): Promise<WhatsAppMessageTemplate[]> {
  const result = await metaRequest(connectionId)
  const data = Array.isArray(result.data) ? (result.data as MetaTemplate[]) : []
  return data.map(normalizeTemplate).filter(template => template.id && template.name)
}

export async function createWhatsAppMessageTemplate(
  connectionId: string,
  rawInput: CreateWhatsAppTemplateInput
): Promise<WhatsAppMessageTemplate> {
  const input = validateWhatsAppTemplateInput(rawInput)
  const examples = input.exampleValues ?? []
  const result = await metaRequest(connectionId, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      language: input.language,
      category: input.category,
      components: [
        {
          type: 'BODY',
          text: input.body,
          ...(examples.length
            ? { example: { body_text: [examples] } }
            : {})
        }
      ]
    })
  })

  return {
    id: String(result.id ?? ''),
    name: input.name,
    status: String(result.status ?? 'PENDING'),
    category: input.category,
    language: input.language,
    body: input.body
  }
}
