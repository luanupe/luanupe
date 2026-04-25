import type { Request, Response } from 'express'

import packageJson from '../../package.json'

import { cacheWarmupService } from '../services/cache-warmup.service'

export function healthController(_request: Request, response: Response): void {
  response.json({
    status: 'ok',
    name: packageJson.name,
    version: packageJson.version,
    uptime: Math.round(process.uptime()),
    lastCacheWarmupAt: cacheWarmupService.getLastWarmupAt(),
  })
}
