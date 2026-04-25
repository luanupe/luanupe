const TOKEN_PATTERNS = [/github_pat_[A-Za-z0-9_]+/g, /gh[pousr]_[A-Za-z0-9_]+/g]

export interface SerializedError {
  message: string
  stack?: string
  cause?: SerializedError
}

export function sanitizeErrorValue(value: string): string {
  return TOKEN_PATTERNS.reduce(
    (sanitized, pattern) => sanitized.replace(pattern, '[redacted]'),
    value,
  )
    .replace(/(GH_TOKEN|GITHUB_TOKEN)=([^\s]+)/g, '$1=[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9_.-]+/gi, '$1[redacted]')
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      message: sanitizeErrorValue(error.message),
      stack: error.stack ? sanitizeErrorValue(error.stack) : undefined,
    }

    if (error.cause) {
      serialized.cause = serializeError(error.cause)
    }

    return serialized
  }

  return {
    message: sanitizeErrorValue(String(error)),
  }
}
