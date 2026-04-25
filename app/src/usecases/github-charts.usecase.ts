import { config } from '../config'
import { getCachedValue } from '../cache'

import { debugLog, elapsedMs } from '../utils/debug.utils'

import { GitHubCliService } from '../services/github-cli.service'
import type { GitHubContributionRange, GitHubContributions } from '../services/github-cli.service.types'

import type {
  GitHubChartPoint,
  GitHubCharts,
  GitHubChartsOptions,
} from './github-charts.usecase.types'

export class GitHubChartsUsecase {
  constructor(private readonly github = new GitHubCliService()) {}

  execute(options: GitHubChartsOptions, cacheOptions: { forceRefresh?: boolean } = {}): Promise<GitHubCharts> {
    return getCachedValue({
      namespace: 'github',
      key: `charts:${config.GITHUB_USERNAME.toLowerCase()}:years:${options.years}:months:${options.months}`,
      factory: () => this.buildCharts(options),
      forceRefresh: cacheOptions.forceRefresh,
    })
  }

  private async buildCharts(options: GitHubChartsOptions): Promise<GitHubCharts> {
    const startedAt = process.hrtime.bigint()
    debugLog('github charts build started', {
      years: options.years,
      months: options.months,
    })
    const now = new Date()
    const username = config.GITHUB_USERNAME
    const yearlyRanges = this.buildYearlyRanges(options.years, now)
    const monthlyRanges = this.buildMonthlyRanges(options.months, now)
    const contributionsByRange = await this.github.getContributionsByRanges(username, [
      ...yearlyRanges,
      ...monthlyRanges,
    ])
    const yearly = yearlyRanges.map((range) => ({
      year: Number(range.key.replace('year-', '')),
      ...this.contributionPoint(contributionsByRange[range.key]),
    }))
    const monthly = monthlyRanges.map((range) => {
      const [, year, month] = range.key.split('-')

      return {
        year: Number(year),
        month: Number(month),
        label: this.monthLabel(Number(year), Number(month)),
        ...this.contributionPoint(contributionsByRange[range.key]),
      }
    })

    const charts = {
      generatedAt: now.toISOString(),
      range: options,
      yearly,
      monthly,
    }

    debugLog('github charts build finished', {
      durationMs: elapsedMs(startedAt),
      yearlyRanges: yearlyRanges.length,
      monthlyRanges: monthlyRanges.length,
    })

    return charts
  }

  private buildYearlyRanges(
    years: number,
    now: Date,
  ): GitHubContributionRange[] {
    const currentYear = now.getUTCFullYear()
    const startYear = currentYear - years + 1
    const yearNumbers = Array.from({ length: years }, (_, index) => startYear + index)

    return yearNumbers.map((year) => {
      const from = this.startOfUtcYear(year)
      const yearEnd = this.startOfUtcYear(year + 1)
      const to = year === currentYear ? now : yearEnd

      return {
        key: `year-${year}`,
        from: this.toIsoDate(from),
        to: this.toIsoDate(to),
      }
    })
  }

  private buildMonthlyRanges(
    months: number,
    now: Date,
  ): GitHubContributionRange[] {
    const currentMonthStart = this.startOfUtcMonth(now.getUTCFullYear(), now.getUTCMonth())
    const firstMonth = this.addUtcMonths(currentMonthStart, -(months - 1))
    const monthStarts = Array.from({ length: months }, (_, index) =>
      this.addUtcMonths(firstMonth, index),
    )

    return monthStarts.map((from) => {
      const nextMonth = this.addUtcMonths(from, 1)
      const to = nextMonth > now ? now : nextMonth
      const year = from.getUTCFullYear()
      const month = from.getUTCMonth() + 1

      return {
        key: `month-${year}-${month}`,
        from: this.toIsoDate(from),
        to: this.toIsoDate(to),
      }
    })
  }

  private contributionPoint(contributions: GitHubContributions): GitHubChartPoint {
    const total =
      contributions.totalCommitContributions +
      contributions.totalIssueContributions +
      contributions.totalPullRequestContributions +
      contributions.totalPullRequestReviewContributions +
      contributions.totalRepositoryContributions

    return {
      total,
      commits: contributions.totalCommitContributions,
      pullRequests: contributions.totalPullRequestContributions,
      issues: contributions.totalIssueContributions,
      reviews: contributions.totalPullRequestReviewContributions,
      repositories: contributions.totalRepositoryContributions,
      restricted: contributions.restrictedContributionsCount,
    }
  }

  private toIsoDate(date: Date): string {
    return date.toISOString()
  }

  private startOfUtcYear(year: number): Date {
    return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  }

  private startOfUtcMonth(year: number, monthIndex: number): Date {
    return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  }

  private addUtcMonths(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))
  }

  private monthLabel(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`
  }
}
