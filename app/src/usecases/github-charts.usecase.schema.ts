import { z } from 'zod'

export const githubChartsQuerySchema = z.object({
  years: z.coerce.number().int().min(1).max(5).default(5),
  months: z.coerce.number().int().min(1).max(60).default(12),
})

export type GitHubChartsQuery = z.infer<typeof githubChartsQuerySchema>

export function parseGitHubChartsQuery(query: unknown): GitHubChartsQuery {
  return githubChartsQuerySchema.parse(query)
}
