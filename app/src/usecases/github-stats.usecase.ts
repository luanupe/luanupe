import { config } from '../config'
import { getCachedValue } from '../cache'

import { debugLog, elapsedMs } from '../utils/debug.utils'

import { GitHubCliService } from '../services/github-cli.service'
import type { GitHubContributionRange, GitHubContributions, GitHubRepository } from '../services/github-cli.service.types'

import type { GitHubStats } from './github-stats.usecase.types'

const HISTORY_YEARS = 10

export class GitHubStatsUsecase {
  constructor(private readonly github = new GitHubCliService()) {}

  execute(options: { forceRefresh?: boolean } = {}): Promise<GitHubStats> {
    return getCachedValue({
      namespace: 'github',
      key: `stats:${config.GITHUB_USERNAME.toLowerCase()}`,
      factory: () => this.buildStats(),
      forceRefresh: options.forceRefresh,
    })
  }

  private async buildStats(): Promise<GitHubStats> {
    const startedAt = process.hrtime.bigint()
    debugLog('github stats build started')
    const prWindow = this.github.getContributionYearDateRangeYmd()
    const now = new Date()
    const historyRanges = this.buildYearlyRanges(HISTORY_YEARS, now)
    const historyPrFromYmd = historyRanges[0]!.from.slice(0, 10)
    const historyPrToYmd = now.toISOString().slice(0, 10)
    const [user, repositories, contributions, pullRequestsFromSearch, pullRequestsTenYearsSearch, yearlyHistory] =
      await Promise.all([
        this.github.getAuthenticatedUser(),
        this.github.listRepositories(),
        this.github.getContributions(config.GITHUB_USERNAME),
        this.github.countPullRequestsOpenedByAuthorInRange(
          config.GITHUB_USERNAME,
          prWindow.fromYmd,
          prWindow.toYmd,
        ),
        this.github.countPullRequestsOpenedByAuthorInRange(
          config.GITHUB_USERNAME,
          historyPrFromYmd,
          historyPrToYmd,
        ),
        this.github.getContributionsByRanges(config.GITHUB_USERNAME, historyRanges),
      ])

    debugLog('github stats dependencies loaded', {
      durationMs: elapsedMs(startedAt),
      repositories: repositories.length,
    })

    if (user.login.toLowerCase() !== config.GITHUB_USERNAME.toLowerCase()) {
      throw new Error('GITHUB_USERNAME does not match the authenticated GitHub token owner')
    }

    // Same five fields as charts (contributionsCollection) so YTD matches the current-year bar.
    const contributionsTotal =
      contributions.totalCommitContributions +
      contributions.totalIssueContributions +
      contributions.totalPullRequestContributions +
      contributions.totalPullRequestReviewContributions +
      contributions.totalRepositoryContributions

    const historyPoints = historyRanges.map((range) => {
      const point = yearlyHistory[range.key]
      const year = Number(range.key.replace('year-', ''))
      const total = this.totalContributions(point)
      return { year, total }
    })
    const topYear = historyPoints.reduce(
      (best, point) => (point.total > best.total ? point : best),
      historyPoints[0]!,
    )
    const totalPullRequests = pullRequestsTenYearsSearch
    const totalContributionsTenYears = historyPoints.reduce((sum, point) => sum + point.total, 0)

    const stats = {
      generatedAt: new Date().toISOString(),
      profile: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
        followers: user.followers,
        following: user.following,
        publicRepos: user.public_repos,
        publicGists: user.public_gists,
        totalPrivateRepos: user.total_private_repos || 0,
      },
      repositories: this.summarizeRepos(repositories),
      languages: this.aggregateRepositoryLanguages(repositories),
      contributions: {
        year: this.github.getCurrentYear(),
        total: contributionsTotal,
        commits: contributions.totalCommitContributions,
        issues: contributions.totalIssueContributions,
        pullRequests: pullRequestsFromSearch,
        pullRequestReviews: contributions.totalPullRequestReviewContributions,
        repositories: contributions.totalRepositoryContributions,
        restricted: contributions.restrictedContributionsCount,
      },
      history: {
        years: HISTORY_YEARS,
        topYear: topYear.year,
        totalPullRequests,
        totalContributions: totalContributionsTenYears,
      },
    }

    debugLog('github stats build finished', { durationMs: elapsedMs(startedAt) })

    return stats
  }

  private aggregateRepositoryLanguages(repositories: GitHubRepository[]): GitHubStats['languages'] {
    const totals = new Map<string, number>()

    for (const repo of repositories) {
      if (!repo.language || repo.fork) {
        continue
      }

      totals.set(repo.language, (totals.get(repo.language) || 0) + repo.size)
    }

    const totalBytes = Array.from(totals.values()).reduce((sum, bytes) => sum + bytes, 0)

    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: totalBytes ? Number(((bytes / totalBytes) * 100).toFixed(2)) : 0,
      }))
  }

  private summarizeRepos(repositories: GitHubRepository[]): GitHubStats['repositories'] {
    return repositories.reduce(
      (summary, repo) => {
        summary.total += 1
        summary.private += repo.private ? 1 : 0
        summary.public += repo.private ? 0 : 1
        summary.forks += repo.fork ? 1 : 0
        summary.stargazers += repo.stargazers_count || 0
        summary.watchers += repo.watchers_count || 0
        summary.openIssues += repo.open_issues_count || 0

        return summary
      },
      {
        total: 0,
        private: 0,
        public: 0,
        forks: 0,
        stargazers: 0,
        watchers: 0,
        openIssues: 0,
      },
    )
  }

  private buildYearlyRanges(years: number, now: Date): GitHubContributionRange[] {
    const currentYear = now.getUTCFullYear()
    const startYear = currentYear - years + 1
    const yearNumbers = Array.from({ length: years }, (_, index) => startYear + index)

    return yearNumbers.map((year) => {
      const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
      const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
      const to = year === currentYear ? now : yearEnd

      return {
        key: `year-${year}`,
        from: from.toISOString(),
        to: to.toISOString(),
      }
    })
  }

  private totalContributions(contributions: GitHubContributions): number {
    return (
      contributions.totalCommitContributions +
      contributions.totalIssueContributions +
      contributions.totalPullRequestContributions +
      contributions.totalPullRequestReviewContributions +
      contributions.totalRepositoryContributions +
      contributions.restrictedContributionsCount
    )
  }
}
