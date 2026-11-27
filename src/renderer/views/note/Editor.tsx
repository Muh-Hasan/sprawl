import '@blocknote/shadcn/style.css'
import './editor.css'
import { filterSuggestionItems } from '@blocknote/core'
import { en } from '@blocknote/core/locales'
import {
  DragHandleButton,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
  type SideMenuProps,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { noteSchema } from '@shared/blocknoteSchema'
import { currentBody, liveBody, useNoteStore } from '@/stores/noteStore'
import { useFocusRequest } from './useFocusRequest'

/**
 * The note body editor (PRODUCT §3.2, UI_SPEC §5.1): BlockNote with Sprawl's block schema,
 * lazy-loaded the first time a note is opened so it never weighs on the cold start.
 *
 * - `panel`: the full editor in the note panel: markdown shortcuts, the `/` menu, the
 *   formatting toolbar and the drag handle.
 * - `card`: quick writing right in a canvas card. Plain text, styled like the card's preview:
 *   no markdown shortcuts except `[] ` for a checklist item, no menus, and pasted text stays
 *   text. Blocks made in the panel keep a quiet card-sized look.
 *
 * The panel and a card can show the same note at once; the one not being typed in follows the
 * other live (see `liveBody` in the note store).
 */

const dictionary = (placeholder: string) => ({
  ...en,
  placeholders: { ...en.placeholders, default: placeholder, emptyDocument: placeholder },
  slash_menu: {
    ...en.slash_menu,
    heading: { ...en.slash_menu.heading, title: 'Heading', subtext: 'A section heading' },
  },
})

const PANEL_DICTIONARY = dictionary("Type '/' for blocks")
const CARD_DICTIONARY = dictionary('Write something…')

/**
 * The block shortcuts the card switches off: typing `# `, `- `, `1. `, `> `, `---` or ``` in a
 * card stays text. `[] ` (a checklist item) is kept: to-dos are what stickies are for.
 */
const CARD_DISABLED_EXTENSIONS = [
  'heading-shortcuts',
  'bullet-list-item-shortcuts',
  'numbered-list-item-shortcuts',
  'quote-block-shortcuts',
  'divider-block-shortcuts',
  'code-block-keyboard-shortcuts',
]

/**
 * The slash-menu items Sprawl offers (PRODUCT §3.2). later: phase-7 adds image and file (they
 * need attachments), phase-9 the `[[` link picker.
 */
const SLASH_KEYS = new Set([
  'paragraph',
  'heading',
  'bullet_list',
  'numbered_list',
  'check_list',
  'quote',
  'code_block',
  'divider',
])

/**
 * The formatting toolbar without text alignment: it isn't part of the note model (markdown
 * export can't keep it). There's no color button: the schema has no color styles.
 */
const toolbarItems = getFormattingToolbarItems().filter(
  (item) => !String(item.key).startsWith('textAlign'),
)

function NoteFormattingToolbar() {
  return <FormattingToolbar>{toolbarItems}</FormattingToolbar>
}

/**
 * The side menu is the drag handle alone (UI_SPEC §5.1), so it fits the panel's 24px gutter;
 * new blocks come from Enter and `/`. Its menu only deletes: block colors don't exist here.
 */
function NoteSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <DragHandleButton {...props}>
        <RemoveBlockItem>Delete</RemoveBlockItem>
      </DragHandleButton>
    </SideMenu>
  )
}

function nonEmpty(blocks: unknown[] | null): unknown[] | undefined {
  return blocks && blocks.length > 0 ? blocks : undefined
}

function parseBody(json: string): unknown[] | undefined {
  try {
    const blocks = JSON.parse(json) as unknown
    return Array.isArray(blocks) && blocks.length > 0 ? blocks : undefined
  } catch {
    return undefined
  }
}

interface EditorProps {
  /**
   * The body to start from if the note store has nothing newer. The editor is keyed by note, so
   * this is only read on mount.
   */
  bodyJson: string
  variant?: 'panel' | 'card'
  /** Put the cursor at the end of the body on mount. */
  autoFocus?: boolean
  /**
   * In the panel, the open note: the editor puts the cursor at the end of the body when the
   * note is opened asking for it (`uiStore.openNote`'s `focus: 'body'`).
   */
  noteId?: string
}

export default function Editor({
  bodyJson,
  variant = 'panel',
  autoFocus = false,
  noteId,
}: EditorProps) {
  const card = variant === 'card'
  const editor = useCreateBlockNote({
    schema: noteSchema,
    dictionary: card ? CARD_DICTIONARY : PANEL_DICTIONARY,
    // Start from what the note's other editor shows (it may hold unsaved typing), else the
    // latest body. BlockNote accepts partial blocks and fills in the defaults.
    initialContent: (nonEmpty(currentBody()) ?? parseBody(bodyJson)) as never,
    disableExtensions: card ? CARD_DISABLED_EXTENSIONS : undefined,
    // In a card, pasted text is text (not markdown turned into headings and lists).
    pasteHandler: card
      ? ({ defaultPasteHandler }) => defaultPasteHandler({ plainTextAsMarkdown: false })
      : undefined,
  })
  const items = useMemo(
    () =>
      getDefaultReactSlashMenuItems(editor).filter((item) =>
        SLASH_KEYS.has((item as DefaultReactSuggestionItem & { key: string }).key),
      ),
    [editor],
  )

  const focusEnd = useCallback(() => {
    const last = editor.document.at(-1)
    if (last) editor.setTextCursorPosition(last, 'end')
    editor.focus()
  }, [editor])
  useEffect(() => {
    if (autoFocus) focusEnd()
  }, [focusEnd, autoFocus])
  useFocusRequest(noteId, 'body', focusEnd)

  // Follow the other editor of this note (the panel while typing in the card, or the other way
  // round). Its document is copied in once per frame; the copy isn't reported back as an edit.
  const id = useId()
  const applying = useRef(false)
  useEffect(() => {
    let frame = 0
    const unsubscribe = useNoteStore.subscribe((s, prev) => {
      if (s.bodyRev === prev.bodyRev) return
      const source = liveBody()
      if (!source || source.id === id || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const latest = liveBody()
        if (!latest || latest.id === id) return
        applying.current = true
        try {
          editor.replaceBlocks(editor.document, latest.document() as never)
        } finally {
          applying.current = false
        }
      })
    })
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
      // Leaving: if this was the editor typed in last, hand its document to the store.
      let json: string | null
      try {
        json = JSON.stringify(editor.document)
      } catch {
        json = null // already torn down; the store keeps the last saved body
      }
      useNoteStore.getState().detachBody(id, json)
    }
  }, [editor, id])

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      sideMenu={false}
      formattingToolbar={false}
      data-testid={card ? 'note-card-editor' : 'note-editor'}
      className={card ? 'sprawl-editor sprawl-editor-card' : 'sprawl-editor'}
      onChange={() => {
        if (applying.current) return
        useNoteStore.getState().bodyChanged({ id, document: () => editor.document })
      }}
    >
      {!card && (
        <>
          <SideMenuController sideMenu={NoteSideMenu} />
          <FormattingToolbarController formattingToolbar={NoteFormattingToolbar} />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => filterSuggestionItems(items, query)}
          />
        </>
      )}
    </BlockNoteView>
  )
}
