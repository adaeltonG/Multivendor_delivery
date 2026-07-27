import mongoose, { trusted } from 'mongoose'
import { describe, expect, it } from 'vitest'

describe('sanitized MongoDB filters', () => {
  it('preserves server-constructed operators only when explicitly trusted', () => {
    const trustedFilter = {
      userType: trusted({ $in: ['VENDOR', 'ADMIN'] })
    }
    mongoose.sanitizeFilter(trustedFilter)

    expect(trustedFilter.userType.$in).toEqual(['VENDOR', 'ADMIN'])
    expect(trustedFilter.userType).not.toHaveProperty('$eq')

    const untrustedFilter = {
      userType: { $in: ['VENDOR', 'ADMIN'] }
    }
    mongoose.sanitizeFilter(untrustedFilter)

    expect(untrustedFilter.userType).toEqual({
      $eq: { $in: ['VENDOR', 'ADMIN'] }
    })
  })
})
