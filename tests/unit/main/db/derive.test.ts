import { describe, expect, it } from 'vitest'
import { deriveBody, textToBody } from '../../../../src/main/db/derive'

const text = (t: string) => [{ type: 'text', text: t, styles: {} }]
const block = (type: string, content: unknown, extra: Record<string, unknown> = {}) => ({
  id: Math.random().toString(36),
  type,
  props: {},
  content,
  children: [],
  ...extra,
})
const check = (t: string, checked: boolean) =>
  block('checkListItem', text(t), { props: { checked } })

describe('deriveBody', () => {
  it('joins the inline text with a newline per block', () => {
    const doc = [
      block('heading', text('Plan'), { props: { level: 1 } }),
      block('paragraph', [
        { type: 'text', text: 'Read ', styles: {} },
        { type: 'text', text: 'this', styles: { bold: true } },
        { type: 'link', href: 'https://x.dev', content: text(' link') },
      ]),
      block('codeBlock', text('npm test')),
    ]
    expect(deriveBody(doc).bodyText).toBe('Plan\nRead this link\nnpm test')
  })

  it('walks nested children in document order', () => {
    const doc = [
      block('bulletListItem', text('parent'), {
        children: [block('bulletListItem', text('child'), { children: [check('deep', true)] })],
      }),
      block('paragraph', text('after')),
    ]
    const derived = deriveBody(doc)
    expect(derived.bodyText).toBe('parent\nchild\ndeep\nafter')
    expect(derived).toMatchObject({ checkTotal: 1, checkDone: 1 })
  })

  it('counts checklist items, done ones, and image and file blocks', () => {
    const doc = [
      check('a', true),
      check('b', false),
      check('c', true),
      block('image', undefined, { props: { url: 'sprawl-file://attachment/1' } }),
      block('file', undefined),
      block('divider', undefined),
    ]
    expect(deriveBody(doc)).toEqual({
      bodyText: 'a\nb\nc',
      checkTotal: 3,
      checkDone: 2,
      attachCount: 2,
    })
  })

  it('drops empty blocks at the ends but keeps blank lines in between', () => {
    const doc = [
      block('paragraph', []),
      block('paragraph', text('one')),
      block('paragraph', []),
      block('paragraph', text('two')),
      block('paragraph', []),
    ]
    expect(deriveBody(doc).bodyText).toBe('one\n\ntwo')
  })

  it('gives nothing for an empty document and ignores junk', () => {
    expect(deriveBody([])).toEqual({ bodyText: '', checkTotal: 0, checkDone: 0, attachCount: 0 })
    expect(deriveBody([null, 3, 'x', { type: 'paragraph', content: 'not inline' }])).toEqual({
      bodyText: '',
      checkTotal: 0,
      checkDone: 0,
      attachCount: 0,
    })
  })

  it('round-trips a pasted body', () => {
    const { bodyJson, bodyText } = textToBody('a\n\nb')
    expect(deriveBody(JSON.parse(bodyJson) as unknown[]).bodyText).toBe(bodyText)
  })
})
