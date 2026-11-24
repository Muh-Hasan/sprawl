import { describe, expect, it } from 'vitest'
import { findDeepLink, parseDeepLink } from '../../../src/shared/deepLink'

describe('parseDeepLink', () => {
  it('parses note links', () => {
    expect(parseDeepLink('sprawl://note/V1StGXR8_Z5jdHi6B-myT')).toEqual({
      type: 'open-note',
      id: 'V1StGXR8_Z5jdHi6B-myT',
    })
    expect(parseDeepLink('sprawl://note/abc/')).toEqual({ type: 'open-note', id: 'abc' })
  })

  it('parses the list due link', () => {
    expect(parseDeepLink('sprawl://list/due')).toEqual({ type: 'open-list-due' })
  })

  it.each([
    'https://note/abc',
    'sprawl://note/',
    'sprawl://note/a b',
    'sprawl://note/abc/extra',
    'sprawl://note/' + 'x'.repeat(65),
    'sprawl://list/open',
    'sprawl://settings',
    'not a url',
  ])('rejects %s', (raw) => {
    expect(parseDeepLink(raw)).toBeNull()
  })
})

describe('findDeepLink', () => {
  it('finds the link among the other Windows argv entries', () => {
    expect(
      findDeepLink(['C:\\Sprawl\\Sprawl.exe', '--allow-file-access', 'sprawl://note/n1']),
    ).toEqual({ type: 'open-note', id: 'n1' })
  })

  it('returns null without one', () => {
    expect(findDeepLink(['Sprawl.exe', '--hidden'])).toBeNull()
  })
})
