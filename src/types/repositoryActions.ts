export type RepositoryAction = 'create' | 'delete' | 'update'

export interface GitHubAction {
  action: RepositoryAction
  sha: string
  filePath: string
  content: string
  message: string
}
