import { generateGptResponse } from '@/services'
import { Action, Labels } from '@/enums'
import { addLabelToIssue, updateIssue } from '@/services'

import type { Issue, Repository } from '@octokit/webhooks-types'
import type { WebhookHandlerResponse } from '@/types'
import type OpenAI from 'openai'
import type { Octokit } from '@octokit/rest'

export const handleDescription = async (
  issue: Issue,
  repository: Repository,
  octokit: Octokit,
  openai: OpenAI,
  repositoryCodeCache: string
): Promise<WebhookHandlerResponse> => {
  const { title, body } = issue
  const owner = repository.owner.login
  const repo = repository.name
  const issueNumber = issue.number

  try {
    await addLabelToIssue(
      owner,
      repo,
      issueNumber,
      [Labels.InProgress],
      octokit
    )
  } catch (error) {
    console.error('Error adding label:', error)
  }

  const gptResponse = await generateGptResponse(
    title,
    body || '',
    repositoryCodeCache,
    Action.Issue,
    openai
  )

  if (!gptResponse) {
    return { message: 'Issue not updated - no AI response', status: 200 }
  }

  try {
    await updateIssue(
      owner,
      repo,
      issueNumber,
      `${body || ''}\n\n ${gptResponse}`,
      octokit,
      [Labels.Documentation]
    )

    console.log('Issue updated successfully')
    return { message: 'Issue updated with AI response', status: 200 }
  } catch (error) {
    console.error('Error updating issue:', error)
    return { message: 'Failed to update issue', status: 500 }
  }
}
