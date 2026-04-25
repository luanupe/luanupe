export function flattenPaginatedResponse<T>(payload: T[] | T[][]): T[] {
  if (Array.isArray(payload[0])) {
    return (payload as T[][]).flat()
  }

  return payload as T[]
}
