import { describe, expect, it, vi } from 'vitest'
import { User } from '../../models/index.js'
import { executeMongooseQueryResolver } from './executeQueries.js'

describe('Mongoose resolver execution', () => {
  it('executes a returned Mongoose query exactly once', async () => {
    const query = User.find({ userType: 'CUSTOMER' })
    const exec = vi.spyOn(query, 'exec').mockResolvedValue([])
    const resolver = executeMongooseQueryResolver(() => query)

    await expect(resolver()).resolves.toEqual([])
    expect(exec).toHaveBeenCalledTimes(1)
  })

  it('leaves ordinary resolver values unchanged', () => {
    const value = { success: true }
    const resolver = executeMongooseQueryResolver(() => value)

    expect(resolver()).toBe(value)
  })
})
