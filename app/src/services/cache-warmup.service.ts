import { ChartsCardSvgUsecase } from '../usecases/charts-card-svg.usecase'
import { GitHubChartsUsecase } from '../usecases/github-charts.usecase'
import { GitHubStatsUsecase } from '../usecases/github-stats.usecase'
import { StatsCardSvgUsecase } from '../usecases/stats-card-svg.usecase'
import { TopLangsCardSvgUsecase } from '../usecases/top-langs-card-svg.usecase'

export class CacheWarmupService {
  private lastWarmupAt: string | null = null

  constructor(
    readonly githubStatsUsecase = new GitHubStatsUsecase(),
    readonly statsCardSvgUsecase = new StatsCardSvgUsecase(githubStatsUsecase),
    readonly topLangsCardSvgUsecase = new TopLangsCardSvgUsecase(githubStatsUsecase),
    readonly githubChartsUsecase = new GitHubChartsUsecase(),
    readonly chartsCardSvgUsecase = new ChartsCardSvgUsecase(githubChartsUsecase),
  ) {}

  warmupInBackground(): void {
    const startedAt = new Date().toISOString()
    const chartOptions = { years: 10, months: 12 } as const

    void (async () => {
      const tasks: Array<() => Promise<unknown>> = [
        () => this.githubStatsUsecase.execute({ forceRefresh: true }),
        () => this.statsCardSvgUsecase.execute({ forceRefresh: true }),
        () => this.topLangsCardSvgUsecase.execute({ forceRefresh: true }),
        () => this.githubChartsUsecase.execute(chartOptions, { forceRefresh: true }),
        () => this.chartsCardSvgUsecase.execute(chartOptions, { forceRefresh: true }),
      ]

      for (const runTask of tasks) {
        try {
          await runTask()
        } catch (error) {
          console.error(error)
        }
      }

      this.lastWarmupAt = startedAt
    })()
  }

  getLastWarmupAt(): string | null {
    return this.lastWarmupAt
  }
}

export const cacheWarmupService = new CacheWarmupService()
