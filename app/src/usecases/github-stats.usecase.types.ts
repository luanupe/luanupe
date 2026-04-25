export interface GitHubStats {
  generatedAt: string
  profile: {
    login: string
    name: string | null
    avatarUrl: string
    htmlUrl: string
    bio: string | null
    company: string | null
    location: string | null
    followers: number
    following: number
    publicRepos: number
    publicGists: number
    totalPrivateRepos: number
  }
  repositories: {
    total: number
    private: number
    public: number
    forks: number
    stargazers: number
    watchers: number
    openIssues: number
  }
  languages: Array<{
    name: string
    bytes: number
    percentage: number
  }>
  contributions: {
    year: number
    total: number
    commits: number
    issues: number
    pullRequests: number
    pullRequestReviews: number
    repositories: number
    restricted: number
  }
}
