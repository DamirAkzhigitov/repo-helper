import { IssueEvent } from '../types';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { Labels, State } from '../enums';
import {
  getRepositoryCode,
  addLabelToIssue,
  updateIssue,
} from './githubService';
import { generateGptResponse } from './openaiService';
import { ContentfulStatusCode } from 'hono/dist/types/utils/http-status';
import { hasCommonElement } from '../utils/helpers';

const repositoryCodeCache: { [issueId: number]: string } = {};

interface WebhookHandlerResponse {
  message: string;
  status: ContentfulStatusCode;
}

function shouldProcessIssue(issue: IssueEvent['issue']): boolean {
  return (
    issue.state === State.Open &&
    !hasCommonElement(
      issue.labels.map(({ name }) => name),
      [Labels.InProgress, Labels.Documentation],
    )
  );
}

export async function handleGithubIssueWebhook(
  payload: IssueEvent,
  octokit: Octokit,
  openai: OpenAI,
): Promise<WebhookHandlerResponse> {
  const { repository, issue } = payload;

  if (!shouldProcessIssue(issue)) {
    return { message: 'Ignored', status: 200 };
  }

  const { title, body } = issue;
  const owner = repository.owner.login;
  const repo = repository.name;
  const issueNumber = issue.number;

  if (!repositoryCodeCache[issue.id]) {
    try {
      repositoryCodeCache[issue.id] = await getRepositoryCode(
        owner,
        repo,
        octokit,
      );
    } catch (error) {
      console.error('Failed to get repository code:', error);
      return { message: 'Error getting repository code', status: 500 };
    }
  }

  try {
    await addLabelToIssue(
      owner,
      repo,
      issueNumber,
      [Labels.InProgress],
      octokit,
    );
  } catch (error) {
    console.error('Error adding label:', error);
    // Continue processing even if labeling fails
  }

  const gptResponse = await generateGptResponse(
    title,
    body || '',
    repositoryCodeCache[issue.id],
    openai,
  );

  if (!gptResponse) {
    return { message: 'Issue not updated - no AI response', status: 200 };
  }

  try {
    await updateIssue(
      owner,
      repo,
      issueNumber,
      `${body || ''}\n\n ${gptResponse}`,
      octokit,
    );

    console.log('Issue updated successfully');
    return { message: 'Issue updated with AI response', status: 200 };
  } catch (error) {
    console.error('Error updating issue:', error);
    return { message: 'Failed to update issue', status: 500 };
  }
}
