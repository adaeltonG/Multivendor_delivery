import { describe, expect, it } from 'vitest'
import { normalizeWhatsAppPhone } from '../utils/whatsapp.js'

describe('normalizeWhatsAppPhone', () => {
  it('normalizes E.164-style phone numbers for Meta', () => {
    expect(normalizeWhatsAppPhone('+44 7700 900123')).toBe('447700900123')
  })

  it('rejects missing and implausible phone numbers', () => {
    expect(normalizeWhatsAppPhone(undefined)).toBeNull()
    expect(normalizeWhatsAppPhone('123')).toBeNull()
  })
})
