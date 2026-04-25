import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CACHE_TTL: z.string().min(1).default('1h'),
  GITHUB_USERNAME: z.string().min(1),
  GITHUB_TOKEN: z.string().min(1),
  GH_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  NEW_RELIC_APP_NAME: z.string().min(1).optional(),
  NEW_RELIC_LICENSE_KEY: z.string().min(1).optional(),
})

export const config = envSchema.parse(process.env)
