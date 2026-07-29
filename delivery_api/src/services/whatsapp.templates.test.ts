import { describe, expect, it } from 'vitest'
import { validateWhatsAppTemplateInput } from './whatsapp.template-validation.js'

describe('validateWhatsAppTemplateInput', () => {
  it('accepts a valid template and trims user input', () => {
    expect(
      validateWhatsAppTemplateInput({
        name: ' order_ready ',
        category: 'UTILITY',
        language: 'en_GB',
        body: ' Order {{1}} is ready for {{2}}. ',
        exampleValues: [' NH-1001 ', ' collection ']
      })
    ).toEqual({
      name: 'order_ready',
      category: 'UTILITY',
      language: 'en_GB',
      body: 'Order {{1}} is ready for {{2}}.',
      exampleValues: ['NH-1001', 'collection']
    })
  })

  it('rejects unsafe names and variable gaps', () => {
    expect(() =>
      validateWhatsAppTemplateInput({
        name: 'Order Ready',
        category: 'UTILITY',
        language: 'en_GB',
        body: 'Order {{1}} is ready.',
        exampleValues: ['NH-1001']
      })
    ).toThrow(/Template name/)

    expect(() =>
      validateWhatsAppTemplateInput({
        name: 'order_ready',
        category: 'UTILITY',
        language: 'en_GB',
        body: 'Order {{2}} is ready.',
        exampleValues: ['NH-1001']
      })
    ).toThrow(/sequential/)
  })

  it('requires one non-empty example per variable', () => {
    expect(() =>
      validateWhatsAppTemplateInput({
        name: 'order_ready',
        category: 'UTILITY',
        language: 'en',
        body: 'Order {{1}} is ready.',
        exampleValues: []
      })
    ).toThrow(/exactly 1/)
  })

  it('rejects authentication templates until the OTP flow is implemented', () => {
    expect(() =>
      validateWhatsAppTemplateInput({
        name: 'login_code',
        category: 'AUTHENTICATION',
        language: 'en_GB',
        body: 'Your code is {{1}}.',
        exampleValues: ['123456']
      })
    ).toThrow(/dedicated OTP/)
  })
})
