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

  getLastWarmupAt(): string | null {
    return this.lastWarmupAt
  }

  warmupInBackground(): void {
    const startedAt = new Date().toISOString()

    void Promise.allSettled([
      this.githubStatsUsecase.execute(),
      this.statsCardSvgUsecase.execute(),
      this.topLangsCardSvgUsecase.execute(),
      this.githubChartsUsecase.execute({ years: 5, months: 12 }),
      this.chartsCardSvgUsecase.execute({ years: 5, months: 12 }),
    ]).then((results) => {
      this.lastWarmupAt = startedAt

      for (const result of results) {
        if (result.status === 'rejected') {
          console.error(result.reason)
        }
      }
    })
  }
}

export const cacheWarmupService = new CacheWarmupService()
