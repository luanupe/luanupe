export interface GitHubChartPoint {
  total: number
  commits: number
  pullRequests: number
  issues: number
  reviews: number
  repositories: number
  restricted: number
}

export interface GitHubYearlyChartPoint extends GitHubChartPoint {
  year: number
}

export interface GitHubMonthlyChartPoint extends GitHubChartPoint {
  year: number
  month: number
  label: string
}

export interface GitHubChartsOptions {
  years: number
  months: number
}

export interface GitHubCharts {
  generatedAt: string
  range: GitHubChartsOptions
  yearly: GitHubYearlyChartPoint[]
  monthly: GitHubMonthlyChartPoint[]
}
