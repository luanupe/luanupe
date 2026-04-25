import { getCachedValue } from '../cache'
import { config } from '../config'
import { GitHubCliService } from '../services/github-cli.service'
import type { GitHubRepository } from '../services/github-cli.service.types'
import { debugLog, elapsedMs } from '../utils/debug.utils'
import type { GitHubStats } from './github-stats.usecase.types'

export class GitHubStatsUsecase {
  constructor(private readonly github = new GitHubCliService()) {}

  execute(): Promise<GitHubStats> {
    return getCachedValue({
      namespace: 'github',
      key: `stats:${config.GITHUB_USERNAME.toLowerCase()}`,
      factory: () => this.buildStats(),
    })
  }

  private async buildStats(): Promise<GitHubStats> {
    const startedAt = process.hrtime.bigint()
    debugLog('github stats build started')
    const [user, repositories, contributions] = await Promise.all([
      this.github.getAuthenticatedUser(),
      this.github.listRepositories(),
      this.github.getContributions(config.GITHUB_USERNAME),
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
      languages: this.aggregateRepositoryLanguages(repositories).slice(0, 10),
      contributions: {
        year: this.github.getCurrentYear(),
        total: contributionsTotal,
        commits: contributions.totalCommitContributions,
        issues: contributions.totalIssueContributions,
        pullRequests: contributions.totalPullRequestContributions,
        pullRequestReviews: contributions.totalPullRequestReviewContributions,
        repositories: contributions.totalRepositoryContributions,
        restricted: contributions.restrictedContributionsCount,
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
}
