import { z } from 'zod'

/** Thrown for IPC input that fails its zod schema. The message reaches the renderer. */
export class IpcInputError extends Error {
  readonly code = 'invalid-input'
  constructor(channel: string, error: z.ZodError) {
    super(`[invalid-input] ${channel}: ${z.prettifyError(error)}`)
    this.name = 'IpcInputError'
  }
}

/** Parses an IPC input with its schema, throwing a typed error. */
export function parseInput<S extends z.ZodType>(
  channel: string,
  schema: S,
  input: unknown,
): z.infer<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw new IpcInputError(channel, result.error)
  return result.data
}
