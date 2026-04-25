import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { config } from '../config'
import { flattenPaginatedResponse } from '../utils/array.utils'
import { debugLog, elapsedMs } from '../utils/debug.utils'
import type {
  GitHubContributionRange,
  GitHubContributions,
  GitHubDetailedContributions,
  GitHubLanguageMap,
  GitHubRepository,
  GitHubSearchResponse,
  GitHubUser,
} from './github-cli.service.types'

const execFileAsync = promisify(execFile)
const CURRENT_YEAR = new Date().getUTCFullYear()
const CONTRIBUTIONS_FROM = `${CURRENT_YEAR}-01-01T00:00:00Z`

/** GitHub GraphQL rejects large single queries (complexity / size); batch aliases. */
const CONTRIBUTION_RANGES_GRAPHQL_BATCH_SIZE = 5

interface GhExecError extends Error {
  code?: number | string
  stdout?: string
  stderr?: string
}

async function runGhApi<T>(args: string[]): Promise<T> {
  const startedAt = process.hrtime.bigint()
  const command = ['gh', 'api', ...args].join(' ')

  debugLog('gh api started', { command })

  try {
    const { stdout } = await execFileAsync('gh', ['api', ...args], {
      env: {
        ...process.env,
        GH_TOKEN: config.GITHUB_TOKEN,
        GITHUB_TOKEN: config.GITHUB_TOKEN,
      },
      maxBuffer: 1024 * 1024 * 20,
      timeout: config.GH_COMMAND_TIMEOUT_MS,
    })

    debugLog('gh api finished', { command, durationMs: elapsedMs(startedAt) })

    return JSON.parse(stdout) as T
  } catch (error) {
    const execError = error as GhExecError
    const details = [
      execError.message,
      execError.stderr ? `stderr: ${execError.stderr.trim()}` : null,
      execError.stdout ? `stdout: ${execError.stdout.trim()}` : null,
      execError.code ? `exit code: ${execError.code}` : null,
    ].filter(Boolean)

    debugLog('gh api failed', { command, durationMs: elapsedMs(startedAt) })

    throw new Error(`gh api failed for "${['api', ...args].join(' ')}": ${details.join(' | ')}`, {
      cause: error,
    })
  }
}

export class GitHubCliService {
  async getAuthenticatedUser(): Promise<GitHubUser> {
    return runGhApi<GitHubUser>(['/user'])
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    const pages = await runGhApi<GitHubRepository[] | GitHubRepository[][]>([
      '/user/repos',
      '--method',
      'GET',
      '--paginate',
      '--slurp',
      '-f',
      'visibility=all',
      '-f',
      'affiliation=owner,collaborator,organization_member',
      '-f',
      'sort=updated',
      '-f',
      'direction=desc',
      '-f',
      'per_page=100',
    ])

    return flattenPaginatedResponse(pages)
  }

  async getRepositoryLanguages(fullName: string): Promise<GitHubLanguageMap> {
    return runGhApi<GitHubLanguageMap>([`/repos/${fullName}/languages`])
  }

  async getContributions(username: string): Promise<GitHubContributions> {
    return this.getContributionsByRange(username, CONTRIBUTIONS_FROM, new Date().toISOString())
  }

  async getDetailedContributions(username: string): Promise<GitHubDetailedContributions> {
    const to = new Date().toISOString()
    const fromDate = CONTRIBUTIONS_FROM.slice(0, 10)
    const toDate = to.slice(0, 10)
    const [baseContributions, commits, issues, pullRequests, pullRequestReviews] = await Promise.all([
      this.getContributionsByRange(username, CONTRIBUTIONS_FROM, to),
      this.searchCount('/search/commits', `author:${username} author-date:${fromDate}..${toDate}`),
      this.searchCount('/search/issues', `author:${username} type:issue created:${fromDate}..${toDate}`),
      this.searchCount('/search/issues', `author:${username} type:pr created:${fromDate}..${toDate}`),
      this.searchCount('/search/issues', `reviewed-by:${username} type:pr updated:${fromDate}..${toDate}`),
    ])

    return {
      ...baseContributions,
      detailedCommitContributions: commits,
      detailedIssueContributions: issues,
      detailedPullRequestContributions: pullRequests,
      detailedPullRequestReviewContributions: pullRequestReviews,
    }
  }

  async getContributionsByRange(
    username: string,
    from: string,
    to: string,
  ): Promise<GitHubContributions> {
    const query = `
      query UserContributions($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalRepositoryContributions
            restrictedContributionsCount
          }
        }
      }
    `

    const data = await runGhApi<{
      data: {
        user: {
          contributionsCollection: GitHubContributions
        }
      }
    }>(['graphql', '-f', `query=${query}`, '-F', `login=${username}`, '-F', `from=${from}`, '-F', `to=${to}`])

    return data.data.user.contributionsCollection
  }

  async getContributionsByRanges(
    username: string,
    ranges: GitHubContributionRange[],
  ): Promise<Record<string, GitHubContributions>> {
    const result: Record<string, GitHubContributions> = {}
    for (let offset = 0; offset < ranges.length; offset += CONTRIBUTION_RANGES_GRAPHQL_BATCH_SIZE) {
      const slice = ranges.slice(offset, offset + CONTRIBUTION_RANGES_GRAPHQL_BATCH_SIZE)
      const batch = await this.fetchContributionsRangesBatch(username, slice)
      Object.assign(result, batch)
    }
    return result
  }

  private async fetchContributionsRangesBatch(
    username: string,
    ranges: GitHubContributionRange[],
  ): Promise<Record<string, GitHubContributions>> {
    const fields = `
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoryContributions
      restrictedContributionsCount
    `
    const rangeSelections = ranges
      .map((range, index) => {
        return `r${index}: contributionsCollection(from: "${range.from}", to: "${range.to}") { ${fields} }`
      })
      .join('\n')
    const query = `
      query UserContributionRanges($login: String!) {
        user(login: $login) {
          ${rangeSelections}
        }
      }
    `

    const data = await runGhApi<{
      data: {
        user: Record<string, GitHubContributions>
      }
    }>(['graphql', '-f', `query=${query}`, '-F', `login=${username}`])

    return Object.fromEntries(
      ranges.map((range, index) => [range.key, data.data.user[`r${index}`]]),
    )
  }

  getCurrentYear(): number {
    return CURRENT_YEAR
  }

  private async searchCount(path: string, query: string): Promise<number> {
    const response = await runGhApi<GitHubSearchResponse>([
      path,
      '--method',
      'GET',
      '-f',
      `q=${query}`,
      '-f',
      'per_page=1',
    ])

    return response.total_count
  }
}
