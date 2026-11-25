import { describe, expect, it } from 'vitest'
import { parseInline } from '../../../../src/renderer/lib/inlineMarkdown'

const text = (t: string) => ({ kind: 'text', text: t })

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('Called the bank')).toEqual([text('Called the bank')])
    expect(parseInline('')).toEqual([])
  })

  it('reads bold, italic and code', () => {
    expect(parseInline('a **b** *c* _d_ `e`')).toEqual([
      text('a '),
      { kind: 'bold', children: [text('b')] },
      text(' '),
      { kind: 'italic', children: [text('c')] },
      text(' '),
      { kind: 'italic', children: [text('d')] },
      text(' '),
      { kind: 'code', text: 'e' },
    ])
  })

  it('nests inside bold and links, but not inside code', () => {
    expect(parseInline('**a _b_**')[0]).toEqual({
      kind: 'bold',
      children: [text('a '), { kind: 'italic', children: [text('b')] }],
    })
    expect(parseInline('`**x**`')).toEqual([{ kind: 'code', text: '**x**' }])
  })

  it('reads links with allowed schemes only', () => {
    expect(parseInline('see [docs](https://x.dev/a)')).toEqual([
      text('see '),
      { kind: 'link', url: 'https://x.dev/a', children: [text('docs')] },
    ])
    expect(parseInline('[x](javascript:alert(1))')).toEqual([text('[x](javascript:alert(1))')])
  })

  it('keeps stray and spaced-out markers as text', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([text('2 * 3 * 4')])
    expect(parseInline('**open')).toEqual([text('**open')])
  })
})
