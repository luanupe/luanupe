import { getCachedValue } from '../cache'
import { config } from '../config'
import { SvgCardService } from '../services/svg-card.service'
import { GitHubStatsUsecase } from './github-stats.usecase'

export class TopLangsCardSvgUsecase {
  constructor(
    private readonly githubStatsUsecase = new GitHubStatsUsecase(),
    private readonly svgCardService = new SvgCardService(),
  ) {}

  execute(): Promise<string> {
    return getCachedValue({
      namespace: 'github',
      key: `top-langs-svg:${config.GITHUB_USERNAME.toLowerCase()}`,
      factory: async () => {
        const stats = await this.githubStatsUsecase.execute()

        return this.svgCardService.renderTopLanguagesCard(stats)
      },
    })
  }
}
