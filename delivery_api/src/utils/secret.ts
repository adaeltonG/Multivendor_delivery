import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

function encryptionKey(): Buffer {
  if (!/^[a-fA-F0-9]{64}$/.test(env.WHATSAPP_TOKEN_ENCRYPTION_KEY)) {
    throw new Error(
      'WHATSAPP_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal key'
    )
  }
  return Buffer.from(env.WHATSAPP_TOKEN_ENCRYPTION_KEY, 'hex')
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.')
}

export function decryptSecret(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split('.')
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('Encrypted credential is malformed')
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}
