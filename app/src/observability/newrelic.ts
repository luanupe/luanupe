import { config } from '../config'

import { sanitizeErrorValue } from '../utils/sanitize.utils'

const agent = require('newrelic') as NewRelicAgent

interface NewRelicAgent {
  recordCustomEvent?: (eventType: string, attributes: Record<string, unknown>) => void
  noticeError?: (error: Error, attributes?: Record<string, unknown>) => void
}

export class NewRelic {
  static recordCustomEvent(
    eventType: string,
    attributes: Record<string, unknown>,
  ): void {
    if (!this.isEnabled()) {
      return
    }

    const sanitizedAttributes = this.sanitizeAttributes({
      ...attributes,
      environment: config.APP_ENV,
      appName: config.NEW_RELIC_APP_NAME || 'unknown',
    })

    agent?.recordCustomEvent?.(eventType, sanitizedAttributes)
  }

  static noticeError(error: Error, attributes: Record<string, unknown> = {}): void {
    if (!this.isEnabled()) {
      return
    }

    const sanitizedAttributes = this.sanitizeAttributes({
      ...attributes,
      environment: config.APP_ENV,
      appName: config.NEW_RELIC_APP_NAME || 'unknown',
    })

    const safeError = new Error(sanitizeErrorValue(error.message))
    safeError.stack = error.stack ? sanitizeErrorValue(error.stack) : undefined
    agent?.noticeError?.(safeError, sanitizedAttributes)
  }

  private static isEnabled(): boolean {
    return Boolean(config.NEW_RELIC_LICENSE_KEY && agent)
  }

  private static sanitizeAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [
        key,
        typeof value === 'string' ? sanitizeErrorValue(value) : value,
      ]),
    )
  }
}
