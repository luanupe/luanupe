import type { Request, Response } from 'express'

import { cacheWarmupService } from '../services/cache-warmup.service'

export function warmupController(_request: Request, response: Response): void {
  cacheWarmupService.warmupInBackground()

  response.status(202).json({
    message: 'Cache warmup started',
  })
}
