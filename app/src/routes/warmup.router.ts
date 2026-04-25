import { Router } from 'express'

import { warmupController } from '../controllers/warmup.controller'

export const warmupRouter = Router()

warmupRouter.get('/warmup', warmupController)
