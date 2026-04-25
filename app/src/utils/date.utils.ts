function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDateTime(value: string): string {
  const date = new Date(value)

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('-') + ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}
