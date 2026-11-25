import type { CanvasOp } from '@shared/types'

/** Undo keeps this many steps; the oldest fall off (ARCHITECTURE §6). */
export const HISTORY_LIMIT = 200

export interface HistoryEntry {
  id: number
  /** The ops that take the canvas back one step (the inverse of what was applied). */
  ops: CanvasOp[]
}

/**
 * The canvas undo and redo stacks: in-memory batches of inverse `CanvasOp`s. Note body edits use
 * the editor's own undo, not this.
 */
export class History {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private nextId = 1

  constructor(private readonly limit = HISTORY_LIMIT) {}

  /** Records a new step (its inverse ops). A new step clears redo. Returns the entry id. */
  record(ops: CanvasOp[]): number {
    this.redoStack = []
    return this.push(this.undoStack, ops)
  }

  /** The step to undo, removed from the stack. */
  takeUndo(): HistoryEntry | undefined {
    return this.undoStack.pop()
  }

  takeRedo(): HistoryEntry | undefined {
    return this.redoStack.pop()
  }

  /**
   * Records the inverse of an undone step, so it can be redone. A step keeps its id through
   * undo and redo, so a toast's Undo still finds it.
   */
  pushRedo(ops: CanvasOp[], id?: number): void {
    this.push(this.redoStack, ops, id)
  }

  /** Records the inverse of a redone step, keeping the rest of redo. */
  pushUndo(ops: CanvasOp[], id?: number): void {
    this.push(this.undoStack, ops, id)
  }

  /** True if `id` is the step Ctrl+Z would undo next. */
  isLatest(id: number): boolean {
    return this.undoStack.at(-1)?.id === id
  }

  /** Removes a step from anywhere in undo (a toast's Undo after other steps). */
  remove(id: number): HistoryEntry | undefined {
    const i = this.undoStack.findIndex((e) => e.id === id)
    return i === -1 ? undefined : this.undoStack.splice(i, 1)[0]
  }

  get undoSize(): number {
    return this.undoStack.length
  }

  get redoSize(): number {
    return this.redoStack.length
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  private push(stack: HistoryEntry[], ops: CanvasOp[], id = this.nextId++): number {
    stack.push({ id, ops })
    if (stack.length > this.limit) stack.splice(0, stack.length - this.limit)
    return id
  }
}

/** The canvas history for the open vault (cleared when the canvas reloads). */
export const canvasHistory = new History()
