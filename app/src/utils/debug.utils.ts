import { config } from '../config'

export function debugLog(message: string, context: Record<string, unknown> = {}): void {
  if (!config.DEBUG_LOGS) {
    return
  }
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message,
      ...context,
    }),
  )
}

export function elapsedMs(startedAt: bigint): number {
  return Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2))
}
