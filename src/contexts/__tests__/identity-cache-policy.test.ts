import { describe, expect, it } from 'vitest'
import { resolveIdentityOnMeFetchFailure } from '../identity-cache-policy'

describe('resolveIdentityOnMeFetchFailure', () => {
  it('online のときはキャッシュを破棄する', () => {
    expect(resolveIdentityOnMeFetchFailure(true)).toEqual({ action: 'clear' })
  })

  it('offline のときはキャッシュを復元する', () => {
    expect(resolveIdentityOnMeFetchFailure(false)).toEqual({ action: 'restore-cache' })
  })
})
