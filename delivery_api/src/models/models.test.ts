import { describe, expect, it } from 'vitest'
import { Order, Restaurant, Rider, User } from './index.js'

describe('database contract', () => {
  it('creates the required geospatial indexes', () => {
    expect(Rider.schema.indexes()).toContainEqual([
      { location: '2dsphere' },
      expect.any(Object)
    ])
    expect(Restaurant.schema.indexes()).toContainEqual([
      { location: '2dsphere' },
      expect.any(Object)
    ])
  })

  it('never selects password hashes by default', () => {
    expect(User.schema.path('password').options.select).toBe(false)
    expect(Rider.schema.path('password').options.select).toBe(false)
    expect(Restaurant.schema.path('password').options.select).toBe(false)
  })

  it('supports the status values consumed by the Enatega clients', () => {
    const values = Order.schema.path('orderStatus').options.enum
    expect(values).toEqual(
      expect.arrayContaining([
        'PENDING',
        'ACCEPTED',
        'ASSIGNED',
        'PICKED',
        'DELIVERED',
        'CANCELLED'
      ])
    )
  })
})
