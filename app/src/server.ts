import express, { type NextFunction, type Request, type Response } from 'express'

import { config } from './config'
import { NewRelic } from './observability/newrelic'
import { healthRouter } from './routes/health.router'
import { statsRouter } from './routes/stats.router'
import { serializeError } from './utils/sanitize.utils'

const app = express()

app.disable('x-powered-by')

app.use((request: Request, response: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint()

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000

    NewRelic.recordCustomEvent('HttpRequest', {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    })
  })

  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(healthRouter)
app.use(statsRouter)

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    message: 'Not found',
  })
})

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const details = serializeError(error)
  const errorForNewRelic = error instanceof Error ? error : new Error(details.message)

  console.error(JSON.stringify(details))
  NewRelic.noticeError(errorForNewRelic)

  response.status(500).json({
    message: 'Unable to load GitHub stats',
    details,
  })
})

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`GitHub stats API listening on port ${config.PORT}`)
})
