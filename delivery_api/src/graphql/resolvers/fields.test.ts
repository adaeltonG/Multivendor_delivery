import { describe, expect, it } from 'vitest'
import { fieldResolvers } from './fields.js'

describe('legacy GraphQL field compatibility', () => {
  it('maps a legacy zone name to the required title field', () => {
    expect(
      fieldResolvers.Zone.title({
        _id: 'legacy-zone-id',
        name: 'Legacy Zone'
      })
    ).toBe('Legacy Zone')
  })

  it('provides a stable title when a legacy zone has neither title nor name', () => {
    expect(
      fieldResolvers.Zone.title({
        _id: 'legacy-zone-id'
      })
    ).toBe('Zone legacy-zone-id')
  })
})
