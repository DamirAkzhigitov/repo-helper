import { Action, Labels } from '@/enums'
import { addLabelToIssue, createBranch, generateGptResponse } from '@/services'
import { toSnakeCase } from '@/utils'

import type { Issue, Repository } from '@octokit/webhooks-types'
import type { GitHubAction, WebhookHandlerResponse } from '@/types'
import type OpenAI from 'openai'
import type { Octokit } from '@octokit/rest'
import { encode } from 'js-base64'

export const handleTodo = async (
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
    Action.Repository,
    openai
  )

  if (!gptResponse) {
    return { message: 'Issue not updated - no AI response', status: 200 }
  }

  const { actions } = JSON.parse(gptResponse) as { actions: GitHubAction[] }

  if (!actions.length) {
    return { message: 'Issue not updated - no AI response', status: 200 }
  }

  const branchName = toSnakeCase(title)

  await createBranch(branchName, 'dev', owner, repo, octokit)

  for await (const action of actions) {
    const actionOptions = {
      owner,
      repo,
      path: action.filePath,
      content: encode(action.content),
      message: action.message,
      branch: branchName,
      ...(action.action === 'update' ? { sha: action.sha } : {})
    }

    await octokit.repos.createOrUpdateFileContents(actionOptions)
  }

  async function createPullRequest() {
    try {
      const { data: pr } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: title,
        head: branchName,
        base: 'dev',
        body: issue.body || ''
      })

      console.log(`Pull request created: ${pr.html_url}`)
    } catch (error) {
      console.error('Error creating pull request:', error)
    }
  }

  await createPullRequest()

  return { message: 'Issue updated with AI response', status: 200 }
}
