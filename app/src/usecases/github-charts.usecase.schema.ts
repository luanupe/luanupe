import { z } from 'zod'

export const githubChartsQuerySchema = z.object({
  years: z.coerce.number().int().min(1).max(10).default(10),
  months: z.coerce.number().int().min(1).max(60).default(12),
})

export type GitHubChartsQuery = z.infer<typeof githubChartsQuerySchema>

export function parseGitHubChartsQuery(query: unknown): GitHubChartsQuery {
  return githubChartsQuerySchema.parse(query)
}
