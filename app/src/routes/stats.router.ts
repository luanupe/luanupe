import { Router } from 'express'

import {
  getChartsController,
  getChartsSvgController,
  getStatsController,
  getStatsSvgController,
  getTopLangsSvgController,
} from '../controllers/stats.controller'

export const statsRouter = Router()

statsRouter.get('/api/stats', getStatsController)
statsRouter.get('/api/stats.svg', getStatsSvgController)
statsRouter.get('/api/top-langs.svg', getTopLangsSvgController)
statsRouter.get('/api/charts', getChartsController)
statsRouter.get('/api/charts.svg', getChartsSvgController)
