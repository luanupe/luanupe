import { EventEmitter } from 'node:events'

import { BentoCache, bentostore } from 'bentocache'
import { memoryDriver } from 'bentocache/drivers/memory'

import { config } from '../config'
import { debugLog } from '../utils/debug.utils'
import { sanitizeErrorValue, serializeError } from '../utils/sanitize.utils'
import { NewRelic } from '../observability/newrelic'

const cacheEmitter = new EventEmitter()

cacheEmitter.on('cache:hit', (data: { key?: string; store?: string }) => {
  const sanitizedKey = sanitizeErrorValue(data.key || '')
  const sanitizedStore = data.store || 'unknown'

  debugLog('cache hit', {
    key: sanitizedKey,
    store: sanitizedStore,
  })

  NewRelic.recordCustomEvent('BentoCacheEvent', {
    result: 'hit',
    key: sanitizedKey,
    store: sanitizedStore,
  })
})

cacheEmitter.on('cache:miss', (data: { key?: string; store?: string }) => {
  const sanitizedKey = sanitizeErrorValue(data.key || '')
  const sanitizedStore = data.store || 'unknown'

  debugLog('cache miss', {
    key: sanitizedKey,
    store: sanitizedStore,
  })

  NewRelic.recordCustomEvent('BentoCacheEvent', {
    result: 'miss',
    key: sanitizedKey,
    store: sanitizedStore,
  })
})

export const bento = new BentoCache({
  default: 'githubStats',
  emitter: cacheEmitter,
  stores: {
    githubStats: bentostore().useL1Layer(
      memoryDriver({ maxSize: '25mb' }),
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
