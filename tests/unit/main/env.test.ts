import { describe, expect, it } from 'vitest'
import { readEnv } from '../../../src/main/env'

describe('readEnv', () => {
  it('defaults to no overrides and E2E off', () => {
    expect(readEnv({})).toEqual({ userData: null, vault: null, e2e: false })
  })

  it('reads the overrides and treats blank values as unset', () => {
    expect(
      readEnv({ SPRAWL_USER_DATA: 'C:\\tmp\\ud', SPRAWL_VAULT: '  ', SPRAWL_E2E: '1' }),
    ).toEqual({ userData: 'C:\\tmp\\ud', vault: null, e2e: true })
  })

  it('only enables E2E for exactly "1"', () => {
    expect(readEnv({ SPRAWL_E2E: 'true' }).e2e).toBe(false)
  })
})
