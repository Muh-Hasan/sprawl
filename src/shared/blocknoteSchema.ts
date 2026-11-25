import {
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'

/**
 * The note body schema (PRODUCT §3.2, ARCHITECTURE §6), shared by the editor and (phase 11)
 * the markdown export: paragraph, headings 1–3, bullet, numbered and check lists, quote, code
 * block, divider, image and file. No tables, toggles, audio or video.
 *
 * Styles are the text ones only (bold, italic, underline, strike, code): the app is
 * monochrome, so BlockNote's text and background colors are left out (DESIGN_SYSTEM §2).
 * later: phase-9 adds the `ref` inline content for `[[links]]`.
 */
export const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: createHeadingBlockSpec({ levels: [1, 2, 3], allowToggleHeadings: false }),
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    quote: defaultBlockSpecs.quote,
    codeBlock: defaultBlockSpecs.codeBlock,
    divider: defaultBlockSpecs.divider,
    image: defaultBlockSpecs.image,
    file: defaultBlockSpecs.file,
  },
  styleSpecs: {
    bold: defaultStyleSpecs.bold,
    italic: defaultStyleSpecs.italic,
    underline: defaultStyleSpecs.underline,
    strike: defaultStyleSpecs.strike,
    code: defaultStyleSpecs.code,
  },
})

export type NoteSchema = typeof noteSchema
