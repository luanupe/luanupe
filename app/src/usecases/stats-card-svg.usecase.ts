import { config } from '../config'
import { getCachedValue } from '../cache'

import { SvgCardService } from '../services/svg-card.service'
import { GitHubStatsUsecase } from './github-stats.usecase'

export class StatsCardSvgUsecase {
  constructor(
    private readonly githubStatsUsecase = new GitHubStatsUsecase(),
    private readonly svgCardService = new SvgCardService(),
  ) {}

  execute(): Promise<string> {
    return getCachedValue({
      namespace: 'github',
      key: `stats-svg:${config.GITHUB_USERNAME.toLowerCase()}`,
      factory: async () => {
        const stats = await this.githubStatsUsecase.execute()
        return this.svgCardService.renderStatsCard(stats)
      },
    })
  }
}
