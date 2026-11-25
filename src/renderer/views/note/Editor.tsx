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
import { useEffect, useMemo } from 'react'
import { noteSchema } from '@shared/blocknoteSchema'
import { useNoteStore } from '@/stores/noteStore'

/**
 * The note body editor (PRODUCT §3.2, UI_SPEC §5.1): BlockNote with Sprawl's block schema,
 * lazy-loaded the first time a panel opens so it never weighs on the cold start.
 */

const PLACEHOLDER = "Type '/' for blocks"

const dictionary = {
  ...en,
  placeholders: { ...en.placeholders, default: PLACEHOLDER, emptyDocument: PLACEHOLDER },
}

/**
 * The slash-menu items Sprawl offers (PRODUCT §3.2). later: phase-7 adds image and file (they
 * need attachments), phase-9 the `[[` link picker.
 */
const SLASH_KEYS = new Set([
  'paragraph',
  'heading',
  'heading_2',
  'heading_3',
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

function parseBody(json: string): unknown[] | undefined {
  try {
    const blocks = JSON.parse(json) as unknown
    return Array.isArray(blocks) && blocks.length > 0 ? blocks : undefined
  } catch {
    return undefined
  }
}

interface EditorProps {
  /** The body to start from. The editor is keyed by note, so this is only read on mount. */
  bodyJson: string
  /**
   * `panel`: the full editor in the note panel. `card`: writing right in a canvas card, sized
   * like the card's text, with no drag handle (no gutter to put it in).
   */
  variant?: 'panel' | 'card'
  /** Put the cursor at the end of the body on mount. */
  autoFocus?: boolean
}

export default function Editor({ bodyJson, variant = 'panel', autoFocus = false }: EditorProps) {
  const editor = useCreateBlockNote({
    schema: noteSchema,
    dictionary,
    // BlockNote accepts partial blocks and fills in the defaults.
    initialContent: parseBody(bodyJson) as never,
  })
  const items = useMemo(
    () =>
      getDefaultReactSlashMenuItems(editor).filter((item) =>
        SLASH_KEYS.has((item as DefaultReactSuggestionItem & { key: string }).key),
      ),
    [editor],
  )
  useEffect(() => {
    if (!autoFocus) return
    const last = editor.document.at(-1)
    if (last) editor.setTextCursorPosition(last, 'end')
    editor.focus()
  }, [editor, autoFocus])

  // In a card the editor sits in the zoomed canvas layer; its menus go outside it, so they keep
  // their size and aren't squeezed at any zoom.
  const portal = variant === 'card' ? document.body : undefined

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      sideMenu={false}
      formattingToolbar={false}
      portalElements={portal ? { default: portal } : undefined}
      data-testid={variant === 'card' ? 'note-card-editor' : 'note-editor'}
      className={variant === 'card' ? 'sprawl-editor sprawl-editor-card' : 'sprawl-editor'}
      onChange={() => useNoteStore.getState().bodyChanged(() => JSON.stringify(editor.document))}
    >
      {variant === 'panel' && <SideMenuController sideMenu={NoteSideMenu} />}
      <FormattingToolbarController
        formattingToolbar={NoteFormattingToolbar}
        portalElement={portal}
      />
      <SuggestionMenuController
        portalElement={portal}
        triggerCharacter="/"
        getItems={async (query) => filterSuggestionItems(items, query)}
      />
    </BlockNoteView>
  )
}
