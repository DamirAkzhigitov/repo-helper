import { encode } from 'js-base64'
import { Action } from '@/enums'
import { generateGptResponse } from '@/services/openaiService'
import type { WebhookHandlerResponse } from '@/types/handlers'
import type { Octokit } from '@octokit/rest'
import type OpenAI from 'openai'
import { getRepositoryCodeFromBranch } from '@/services/githubService'

/**
 * Handles new pull request comment events.
 * Uses the pull request title as the task title and the comment body as the description.
 * It fetches the repository code from the pull request branch, generates repository actions via AI,
 * and applies the code changes directly to the pull request branch.
 */
export const handlePullRequestComment = async (
  payload: any,
  octokit: Octokit,
  openai: OpenAI
): Promise<WebhookHandlerResponse> => {
  // Extract pull request, comment, and repository information from the payload
  const pullRequest = payload.pull_request
  const comment = payload.comment
  const repository = payload.repository

  const owner = repository.owner.login
  const repo = repository.name
  const branchName = pullRequest.head.ref

  console.log(`Handling pull request comment event on branch: ${branchName}`)

  // Get repository code from the PR branch
  let repositoryCode
  try {
    repositoryCode = await getRepositoryCodeFromBranch(owner, repo, branchName, octokit)
  } catch (error) {
    console.error('Error fetching repository code from branch:', error)
    return { message: 'Error fetching repository code', status: 500 }
  }

  // Use pull request title as task title, and comment body as the description
  const title = pullRequest.title
  const description = comment.body

  // Generate GPT response with repository actions based on the new comment
  const gptResponse = await generateGptResponse(
    title,
    description,
    repositoryCode,
    Action.Repository,
    openai
  )
  if (!gptResponse) {
    return { message: 'No AI response obtained', status: 200 }
  }

  let actions: any[]
  try {
    const parsed = JSON.parse(gptResponse)
    actions = parsed.actions
  } catch (error) {
    console.error('Error parsing GPT response:', error)
    return { message: 'Error parsing AI response', status: 500 }
  }

  if (!actions || actions.length === 0) {
    return { message: 'No actions returned by AI', status: 200 }
  }

  // Process each action by updating or creating files in the pull request branch
  for (const action of actions) {
    const actionOptions: any = {
      owner,
      repo,
      path: action.filePath,
      content: encode(action.content),
      message: action.message,
      branch: branchName
    }
    if (action.action === 'update') {
      actionOptions.sha = action.sha
    }
    try {
      await octokit.repos.createOrUpdateFileContents(actionOptions)
      console.log(`Processed action for ${action.filePath}`)
    } catch (error) {
      console.error(`Error processing action for ${action.filePath}:`, error)
      return { message: 'Error updating repository files', status: 500 }
    }
  }

  return { message: 'Pull request updated with AI response', status: 200 }
}
