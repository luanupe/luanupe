import { Router } from 'express'

import { healthController } from '../controllers/health.controller'
import { warmupController } from '../controllers/stats.controller'

export const healthRouter = Router()

healthRouter.get('/health', healthController)
healthRouter.get('/warmup', warmupController)
