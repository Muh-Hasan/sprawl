import { describe, expect, it } from 'vitest'
import { domainLetter, domainOf, normalizeUrl } from '../../../../src/renderer/lib/urls'
import { moveItem } from '../../../../src/renderer/lib/reorder'

describe('normalizeUrl', () => {
  it('keeps http, https and mailto links', () => {
    expect(normalizeUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(normalizeUrl(' http://x.dev ')).toBe('http://x.dev')
    expect(normalizeUrl('mailto:a@b.dev')).toBe('mailto:a@b.dev')
  })

  it('adds https:// to a bare domain', () => {
    expect(normalizeUrl('github.com/sprawl')).toBe('https://github.com/sprawl')
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com')
  })

  it('refuses other schemes and things that are not links', () => {
    for (const bad of [
      'javascript:alert(1)',
      'file:///C:/x',
      'ftp://x.dev',
      'hello',
      'a b.com',
      '',
    ])
      expect(normalizeUrl(bad)).toBeNull()
  })
})

describe('domains', () => {
  it('shows the host without www, and the address of a mailto', () => {
    expect(domainOf('https://www.github.com/x')).toBe('github.com')
    expect(domainOf('mailto:a@b.dev')).toBe('a@b.dev')
    expect(domainLetter('https://www.github.com/x')).toBe('G')
  })
})

describe('moveItem (link reordering)', () => {
  const list = ['a', 'b', 'c', 'd']

  it('moves an item down and up', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(list, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('leaves the list alone for a no-op or an out-of-range index', () => {
    expect(moveItem(list, 1, 1)).toEqual(list)
    expect(moveItem(list, -1, 2)).toEqual(list)
    expect(moveItem(list, 1, 9)).toEqual(list)
  })

  it('never changes the input', () => {
    const input = [...list]
    moveItem(input, 0, 3)
    expect(input).toEqual(list)
  })
})
