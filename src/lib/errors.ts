// src/lib/errors.ts
export type ApiErrorShape = {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(args: { statusCode: number; code: string; message: string; details?: unknown }) {
    super(args.message)
    this.statusCode = args.statusCode
    this.code = args.code
    this.details = args.details
  }
}

export function toApiErrorShape(err: unknown): { statusCode: number; body: ApiErrorShape } {
  // Default “catch-all” (don’t leak internals)
  const fallback = {
    statusCode: 500,
    body: { code: "internal_error", message: "Internal server error" } satisfies ApiErrorShape,
  }

  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      body: { code: err.code, message: err.message, details: err.details },
    }
  }

  // You can expand this later (e.g., map Zod errors, pg errors, etc.)
  return fallback
}