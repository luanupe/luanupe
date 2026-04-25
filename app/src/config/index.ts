import { z } from 'zod'

function envTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false
  }
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CACHE_TTL: z.string().min(1).default('6h'),
  APP_ENV: z.enum(['dev', 'prod']).default('dev'),
  GITHUB_USERNAME: z.string().min(1),
  GITHUB_TOKEN: z.string().min(1),
  GH_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DEBUG_LOGS: z.string().optional().transform((value) => envTruthy(value)),
  NEW_RELIC_APP_NAME: z.string().min(1).optional(),
  NEW_RELIC_LICENSE_KEY: z.string().min(1).optional(),
})

export const config = envSchema.parse(process.env)
