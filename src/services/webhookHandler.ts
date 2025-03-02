import { Labels } from '../enums'
import { handleDescription, handleTodo } from './hooks'

import type { Octokit } from '@octokit/rest'
import type { WebhookHandlerResponse } from '../types'
import type OpenAI from 'openai'

import { getRepositoryCode } from './githubService'
import { WebhookEvent } from '@octokit/webhooks-types'

const repositoryCodeCache: { [issueId: number]: string } = {}

export async function handleGithubIssueWebhook(
  payload: WebhookEvent,
  octokit: Octokit,
  openai: OpenAI
): Promise<WebhookHandlerResponse> {
  if (!('issue' in payload)) {
    return { message: 'Ignored', status: 200 }
  }
  const { repository, issue } = payload

  const labels = issue?.labels?.map(({ name }) => name)

  if (!labels) {
    return { message: 'Ignored', status: 200 }
  }

  if (labels.includes(Labels.InProgress)) {
    return { message: 'Ignored', status: 200 }
  }

  const owner = repository.owner.login
  const repo = repository.name

  if (!repositoryCodeCache[issue.id]) {
    try {
      repositoryCodeCache[issue.id] = await getRepositoryCode(
        owner,
        repo,
        octokit
      )
    } catch (error) {
      console.error('Failed to get repository code:', error)
      return { message: 'Error getting repository code', status: 500 }
    }
  }

  if (labels.includes(Labels.Todo)) {
    return await handleTodo(
      issue,
      repository,
      octokit,
      openai,
      repositoryCodeCache[issue.id]
    )
  }

  if (labels.includes(Labels.PrepDoc)) {
    return await handleDescription(
      issue,
      repository,
      octokit,
      openai,
      repositoryCodeCache[issue.id]
    )
  }

  return { message: 'Ignored', status: 200 }
}
