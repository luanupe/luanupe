import { EventEmitter } from 'node:events'

import { BentoCache, bentostore } from 'bentocache'
import { memoryDriver } from 'bentocache/drivers/memory'

import { config } from '../config'
import { NewRelic } from '../observability/newrelic'
import { debugLog } from '../utils/debug.utils'
import { sanitizeErrorValue, serializeError } from '../utils/sanitize.utils'

const cacheEmitter = new EventEmitter()

cacheEmitter.on('cache:hit', (data: { key?: string; store?: string }) => {
  debugLog('cache hit', { key: sanitizeErrorValue(data.key || ''), store: data.store || 'unknown' })
  NewRelic.recordCustomEvent('BentoCacheEvent', {
    result: 'hit',
    key: sanitizeErrorValue(data.key || ''),
    store: data.store || 'unknown',
  })
})

cacheEmitter.on('cache:miss', (data: { key?: string; store?: string }) => {
  debugLog('cache miss', { key: sanitizeErrorValue(data.key || ''), store: data.store || 'unknown' })
  NewRelic.recordCustomEvent('BentoCacheEvent', {
    result: 'miss',
    key: sanitizeErrorValue(data.key || ''),
    store: data.store || 'unknown',
  })
})

export const bento = new BentoCache({
  default: 'githubStats',
  emitter: cacheEmitter,
  stores: {
    githubStats: bentostore().useL1Layer(
      memoryDriver({
        maxSize: '10mb',
      }),
    ),
  },
})

export function getCachedValue<T>({
  namespace,
  key,
  factory,
}: {
  namespace: string
  key: string
  factory: () => Promise<T>
}): Promise<T> {
  return bento.namespace(namespace).getOrSet({
    key,
    factory,
    ttl: config.CACHE_TTL,
    onFactoryError: (error) => {
      const details = serializeError(error)

      console.error(JSON.stringify(details))
      NewRelic.noticeError(error)
    },
  })
}
