import { IconListCheck } from '@tabler/icons-react'
import type { ListTab } from '@shared/types'
import { EmptyState, type EmptyStateAction } from '@/components/EmptyState'
import { useListStore } from '@/stores/listStore'
import { newNote } from '@/views/search/commands'

const list = () => useListStore.getState()

/** Each tab's empty state (PRODUCT §5): a title, what to do next, and a button that does it. */
const EMPTY: Record<ListTab, { title: string; text: string; action?: EmptyStateAction }> = {
  open: {
    title: 'All clear',
    text: 'Nothing open right now.',
    action: { label: 'New note', testId: 'list-empty-new', onClick: () => newNote() },
  },
  due: {
    title: 'Nothing due',
    text: 'Add a due date to a note to see it here.',
    action: {
      label: 'Show open notes',
      testId: 'list-empty-open',
      onClick: () => list().setTab('open'),
    },
  },
  done: {
    title: 'Nothing done yet',
    text: 'Tick a note and it shows up here.',
    action: {
      label: 'Show open notes',
      testId: 'list-empty-open',
      onClick: () => list().setTab('open'),
    },
  },
  all: {
    title: 'No notes yet',
    text: 'Write your first one.',
    action: { label: 'New note', testId: 'list-empty-new', onClick: () => newNote() },
  },
}

const NO_MATCHES = {
  title: 'No matches',
  text: 'No notes match these filters.',
  action: {
    label: 'Clear filters',
    testId: 'list-empty-clear',
    onClick: () => list().clearFilters(),
  },
}

/** The List's empty state: the tab's own, or No matches while a filter is on. */
export function ListEmpty({ filtering, tab }: { filtering: boolean; tab: ListTab }) {
  const empty = filtering ? NO_MATCHES : EMPTY[tab]
  return (
    <div className="pt-10">
      <EmptyState
        icon={IconListCheck}
        title={empty.title}
        action={empty.action}
        testId="list-empty"
      >
        {empty.text}
      </EmptyState>
    </div>
  )
}
