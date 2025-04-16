import { Labels } from '@/enums'
import {
  handleDescription,
  handleTodo,
  handlePullRequestComment
} from '@/services/hooks'
import { getRepositoryCode } from '@/services'
import type { WebhookEvent } from '@octokit/webhooks-types'
import type { Octokit } from '@octokit/rest'
import type { WebhookHandlerResponse } from '@/types'

const repositoryCodeCache: { [issueId: number]: string } = {}

export async function handleGithubWebhook(
  payload: WebhookEvent,
  octokit: Octokit,
  openai: any
): Promise<WebhookHandlerResponse> {
  console.log('payload: ', payload)

  if ('action' in payload && payload.action === 'created') {
    if ('issue' in payload && 'comment' in payload.issue) {
    }
  }

  // Check for pull request comment events (covers both pull_request_review_comment payloads and
  // issue comment events on pull requests where the issue object has a "pull_request" field)
  // if (
  //   ('pull_request' in payload && 'comment' in payload) ||
  //   ('issue' in payload && payload.issue.pull_request && 'comment' in payload)
  // ) {
  //   console.log('Detected pull request comment event')
  //   return await handlePullRequestComment(payload, octokit, openai)
  // }
  //
  // // If not a pull request event, process issue events as before
  // if (!('issue' in payload)) {
  //   return { message: 'Ignored', status: 200 }
  // }
  // const { repository, issue } = payload
  // const labels = issue?.labels?.map(({ name }: any) => name)
  // console.log('handleGithubIssueWebhook, labels:', labels)
  // if (!labels?.length) {
  //   console.log('Ignored! (no labels)')
  //   return { message: 'Ignored', status: 200 }
  // }
  // if (labels.includes(Labels.InProgress)) {
  //   console.log('Ignored! (in progress)')
  //   return { message: 'Ignored', status: 200 }
  // }
  // const owner = repository.owner.login
  // const repo = repository.name
  // if (!repositoryCodeCache[issue.id]) {
  //   try {
  //     console.log('Fetching repository code for issue...')
  //     repositoryCodeCache[issue.id] = await getRepositoryCode(owner, repo, octokit)
  //   } catch (error) {
  //     console.error('Failed to get repository code:', error)
  //     return { message: 'Error getting repository code', status: 500 }
  //   }
  // }
  // if (labels.includes(Labels.Todo)) {
  //   console.log('Issue includes TODO, handling todo')
  //   return await handleTodo(issue, repository, octokit, openai, repositoryCodeCache[issue.id])
  // }
  // if (labels.includes(Labels.PrepDoc)) {
  //   console.log('Issue includes PrepDoc, handling description')
  //   return await handleDescription(issue, repository, octokit, openai, repositoryCodeCache[issue.id])
  // }
  return { message: 'Ignored', status: 200 }
}
