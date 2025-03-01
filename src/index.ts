import { Hono } from 'hono';
import { Labels, State } from './enums';
import { Env, IssueEvent } from './types';
import { gpt } from './utils/gpt';
import { useOpenai, useOctokit, Middleware } from './middleware';
import { ignorePatterns } from './utils/constants';
import type { Octokit } from '@octokit/rest';
import { hasCommonElement } from './utils/helpers';

const app = new Hono<Env>();

const repositoryCodeCache: { [issueId: number]: string } = {};

async function getRepositoryCode(
  owner: string,
  repo: string,
  octokit: Octokit,
) {
  const {
    data: { default_branch },
  } = await octokit.repos.get({ owner, repo });
  const {
    data: { tree },
  } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: default_branch,
    recursive: 'true',
  });

  let combinedCode = '';
  try {
    for (const file of tree) {
      if (file.type === 'blob' && file.path) {
        const shouldIgnore = ignorePatterns.some((pattern) => {
          if (!file.path) return true;
          const regex = new RegExp(pattern); // Create a RegExp from the pattern
          return regex.test(file.path); // Test if pattern matches the file path
        });

        if (shouldIgnore) continue;

        const { data: fileContent } = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path,
        });
        // @ts-expect-error
        const content = Buffer.from(fileContent.content, 'base64').toString(
          'utf-8',
        );
        combinedCode += `// ${file.path}\n${content}\n\n`;
      }
    }
  } catch (e) {
    console.error('error during getting repository code', e);
  }

  return combinedCode;
}

app.use(useOctokit);
app.use(useOpenai);

app.post('/webhook', async (c) => {
  console.log('c.req: ', c.req);

  const payload = (await c.req.json()) as IssueEvent;

  const { openai, octokit } = c.var as Middleware;

  const { repository, issue } = payload;

  if (
    issue.state !== State.Open ||
    hasCommonElement(
      issue.labels.map(({ name }) => name),
      [Labels.InProgress, Labels.Documentation],
    )
  ) {
    return c.text('Ignored', 200);
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
      return c.text('Error getting repository code', 500); // Or handle error appropriately
    }
  }

  try {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: ['in-progress'],
    });
  } catch (e) {
    console.error('error on label update: ', e);
  }

  const response = await gpt(
    `Your task is ${title}, full description: ${body}}`,
    repositoryCodeCache[issue.id],
    openai,
  );

  if (!response) {
    return c.text('Issue not updated', 200);
  }

  try {
    await octokit.issues.update({
      owner: owner,
      repo: repo,
      issue_number: issueNumber,
      body: `${body}\n\n ${response}`,
    });

    console.log('Issue updated!');

    return c.text('Issue updated with AI response', 200);
  } catch (e) {
    console.error('error on issues update:', e);
    return c.text('Issue not updated', 200);
  }
});

export default app;
