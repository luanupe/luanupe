export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  company: string | null
  location: string | null
  followers: number
  following: number
  public_repos: number
  public_gists: number
  total_private_repos?: number
}

export interface GitHubRepository {
  full_name: string
  private: boolean
  fork: boolean
  language: string | null
  size: number
  stargazers_count: number
  watchers_count: number
  open_issues_count: number
}

export type GitHubLanguageMap = Record<string, number>

export interface GitHubContributions {
  totalCommitContributions: number
  totalIssueContributions: number
  totalPullRequestContributions: number
  totalPullRequestReviewContributions: number
  totalRepositoryContributions: number
  restrictedContributionsCount: number
}

export interface GitHubContributionRange {
  key: string
  from: string
  to: string
}

export interface GitHubSearchResponse {
  total_count: number
}
