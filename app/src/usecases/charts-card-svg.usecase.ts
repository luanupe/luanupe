import { config } from '../config'
import { getCachedValue } from '../cache'

import { SvgCardService } from '../services/svg-card.service'
import { GitHubChartsUsecase } from './github-charts.usecase'

import type { GitHubChartsOptions } from './github-charts.usecase.types'

export class ChartsCardSvgUsecase {
  constructor(
    private readonly githubChartsUsecase = new GitHubChartsUsecase(),
    private readonly svgCardService = new SvgCardService(),
  ) {}

  execute(options: GitHubChartsOptions): Promise<string> {
    return getCachedValue({
      namespace: 'github',
      key: `charts-svg:${config.GITHUB_USERNAME.toLowerCase()}:years:${options.years}:months:${options.months}`,
      factory: async () => {
        const charts = await this.githubChartsUsecase.execute(options)

        return this.svgCardService.renderChartsCard(charts)
      },
    })
  }
}
