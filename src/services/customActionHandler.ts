import { Action, Labels } from '@/enums'
import {
  addLabelToIssue,
  generateGptResponse,
  getRepositoryCode,
  updateIssue
} from '@/services'
import { Octokit } from '@octokit/rest'
import OpenAI from 'openai'

interface CustomActionPayload {
  title: string
  description: string
  repositoryOwner: string
  repositoryName: string
  accessToken: string
  actionType: 'createIssue' // Add more types as needed.
}

interface CustomActionResponse {
  message: string
  status: number
}

export async function handleCustomAction(
  payload: unknown, // We'll refine this 555type later
  openai: OpenAI,
  defaultGithubToken: string
): Promise<CustomActionResponse> {
  // Input Validation
  if (!isCustomActionPayload(payload)) {
    throw new ClientError('Invalid payload format')
  }

  const {
    title,
    description,
    repositoryOwner,
    repositoryName,
    accessToken,
    actionType
  } = payload

  // Authentication
  const octokit = new Octokit({ auth: accessToken || defaultGithubToken })

  // Action Handling (Create Issue)
  if (actionType === 'createIssue') {
    return await handleCreateIssueAction(
      title,
      description,
      repositoryOwner,
      repositoryName,
      octokit,
      openai
    )
  }

  // Future action types can be handled here with else if blocks

  throw new ClientError(`Unsupported action type: ${actionType}`)
}

async function handleCreateIssueAction(
  title: string,
  description: string,
  owner: string,
  repo: string,
  octokit: Octokit,
  openai: OpenAI
): Promise<CustomActionResponse> {
  let issueNumber: number
  try {
    const { data: newIssue } = await octokit.issues.create({
      owner,
      repo,
      title,
      body: description
    })
    issueNumber = newIssue.number
    console.log(`Issue created: ${newIssue.html_url}`)
  } catch (error) {
    console.error('Error creating issue:', error)
    throw new Error('Failed to create issue') // Re-throw for consistent error handling
  }
  try {
    await addLabelToIssue(owner, repo, issueNumber, [Labels.InProgress], octokit)
  } catch (error) {
    console.error('Error adding in-progress label:', error)
  }

  let repositoryCodeCache
  try {
    repositoryCodeCache = await getRepositoryCode(owner, repo, octokit)
  } catch (error) {
    console.error('Failed to get repository code:', error)
    throw new Error('Error getting repository code')
  }

  const gptResponse = await generateGptResponse(
    title,
    description,
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
      `${description}\\ ${gptResponse}`,
      octokit,
      [Labels.Documentation]
    )
    console.log('Issue updated successfully')
  } catch (e) {
    console.log('Issue updating issue descriptions', e)
    return { message: 'Failed to update issue', status: 500 }
  }

  return { message: 'Issue created and processed with AI response', status: 201 }
}

function isCustomActionPayload(
  payload: unknown
): payload is CustomActionPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as CustomActionPayload).title === 'string' &&
    typeof (payload as CustomActionPayload).description === 'string' &&
    typeof (payload as CustomActionPayload).repositoryOwner === 'string' &&
    typeof (payload as CustomActionPayload).repositoryName === 'string' &&
    typeof (payload as CustomActionPayload).accessToken === 'string' &&
    typeof (payload as CustomActionPayload).actionType === 'string'
  )
}

class ClientError extends Error {}
