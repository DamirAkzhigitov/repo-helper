export type RepositoryAction = 'create' | 'delete' | 'move' | 'update' | 'chmod'

export interface GitHubAction {
  action: RepositoryAction
  filePath: string
  content: string // base64 encoded content
  message: string // commit message
}
