import { GraphQLError } from 'graphql'

export const WHATSAPP_TEMPLATE_CATEGORIES = [
  'UTILITY',
  'MARKETING',
  'AUTHENTICATION'
] as const

export type WhatsAppTemplateCategory =
  (typeof WHATSAPP_TEMPLATE_CATEGORIES)[number]

export type CreateWhatsAppTemplateInput = {
  name: string
  category: WhatsAppTemplateCategory
  language: string
  body: string
  exampleValues?: string[]
}

export function validateWhatsAppTemplateInput(
  input: CreateWhatsAppTemplateInput
): CreateWhatsAppTemplateInput {
  const name = input.name.trim()
  const language = input.language.trim()
  const body = input.body.trim()
  const examples = (input.exampleValues ?? []).map(value => value.trim())

  if (!/^[a-z][a-z0-9_]{0,511}$/.test(name)) {
    throw new GraphQLError(
      'Template name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.',
      { extensions: { code: 'BAD_USER_INPUT' } }
    )
  }
  if (!WHATSAPP_TEMPLATE_CATEGORIES.includes(input.category)) {
    throw new GraphQLError('Template category is invalid.', {
      extensions: { code: 'BAD_USER_INPUT' }
    })
  }
  if (input.category === 'AUTHENTICATION') {
    throw new GraphQLError(
      'Authentication templates require a dedicated OTP configuration and are not supported by this form.',
      { extensions: { code: 'BAD_USER_INPUT' } }
    )
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) {
    throw new GraphQLError('Template language must use a code such as en or en_GB.', {
      extensions: { code: 'BAD_USER_INPUT' }
    })
  }
  if (!body || body.length > 1024) {
    throw new GraphQLError('Template body must contain between 1 and 1024 characters.', {
      extensions: { code: 'BAD_USER_INPUT' }
    })
  }

  const rawVariables = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(match =>
    Number(match[1])
  )
  const strippedVariables = body.replace(/\{\{\s*\d+\s*\}\}/g, '')
  if (/[{}]/.test(strippedVariables)) {
    throw new GraphQLError('Template variables must use the format {{1}}, {{2}}, and so on.', {
      extensions: { code: 'BAD_USER_INPUT' }
    })
  }
  const variableNumbers = [...new Set(rawVariables)].sort((a, b) => a - b)
  if (variableNumbers.some((number, index) => number !== index + 1)) {
    throw new GraphQLError('Template variables must be sequential, beginning with {{1}}.', {
      extensions: { code: 'BAD_USER_INPUT' }
    })
  }
  if (examples.length !== variableNumbers.length || examples.some(value => !value)) {
    throw new GraphQLError(
      `Provide exactly ${variableNumbers.length} non-empty example value${
        variableNumbers.length === 1 ? '' : 's'
      } for the template variables.`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    )
  }

  return { name, category: input.category, language, body, exampleValues: examples }
}
