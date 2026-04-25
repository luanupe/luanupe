import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { cacheWarmupService } from '../services/cache-warmup.service'
import { parseGitHubChartsQuery } from '../usecases/github-charts.usecase.schema'

const {
  githubStatsUsecase,
  statsCardSvgUsecase,
  topLangsCardSvgUsecase,
  githubChartsUsecase,
  chartsCardSvgUsecase,
} = cacheWarmupService

function handleValidationError(error: unknown, response: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Invalid query parameters',
      details: error.flatten(),
    })
    return
  }

  next(error)
}

export async function getStatsController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await githubStatsUsecase.execute()

    response.set('Cache-Control', 'public, max-age=60')
    response.json({
      data: stats,
    })
  } catch (error) {
    next(error)
  }
}

export async function getStatsSvgController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const svg = await statsCardSvgUsecase.execute()

    response.type('image/svg+xml')
    response.set('Cache-Control', 'public, max-age=60')
    response.send(svg)
  } catch (error) {
    next(error)
  }
}

export async function getTopLangsSvgController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const svg = await topLangsCardSvgUsecase.execute()

    response.type('image/svg+xml')
    response.set('Cache-Control', 'public, max-age=60')
    response.send(svg)
  } catch (error) {
    next(error)
  }
}

export async function getChartsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = parseGitHubChartsQuery(request.query)
    const charts = await githubChartsUsecase.execute(options)

    response.set('Cache-Control', 'public, max-age=60')
    response.json({
      data: charts,
    })
  } catch (error) {
    handleValidationError(error, response, next)
  }
}

export async function getChartsSvgController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = parseGitHubChartsQuery(request.query)
    const svg = await chartsCardSvgUsecase.execute(options)

    response.type('image/svg+xml')
    response.set('Cache-Control', 'public, max-age=60')
    response.send(svg)
  } catch (error) {
    handleValidationError(error, response, next)
  }
}

export function warmupController(_request: Request, response: Response): void {
  cacheWarmupService.warmupInBackground()

  response.status(202).json({
    message: 'Cache warmup started',
  })
}
