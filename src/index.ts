import { Octokit } from '@octokit/rest';

import { Hono } from 'hono';
import { OpenAI } from 'openai';
import { Labels, State } from './enums';

const app = new Hono();

let OPENAI_API_KEY = '',
  GITHUB_TOKEN = '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const ignorePatterns: string[] = [
  'pnpm-lock.yaml',
  'package.json',
  '.gitignore',
  'tsconfig.json',
  '.prettierrc',
  '.env',
  '.wrangler',
  'wrangler.jsonc',
  'd.ts',
  'vite',
  'test',
  '.editorconfig',
  '.vscode',
];

async function getRepositoryCode(owner: string, repo: string) {
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

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
  for (const file of tree) {
    if (file.type === 'blob' && file.path) {
      const shouldIgnore = ignorePatterns.some((pattern) => {
        if (!file.path) return true;
        const regex = new RegExp(pattern); // Create a RegExp from the pattern
        return regex.test(file.path); // Test if pattern matches the file path
      });

      if (shouldIgnore) {
        console.log('ignored!', file.path);
        continue;
      }

      const { data: fileContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
      });
      const content = Buffer.from(fileContent.content, 'base64').toString(
        'utf-8',
      );
      combinedCode += `// ${file.path}\n${content}\n\n`;
    }
  }
  return combinedCode;
}

app.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as IssueEvent;
  // if (payload.action !== 'opened' || !payload.issue) {
  //   return c.text('Ignored', 200);
  // }
  //
  if (payload.issue.state !== State.Open) return;

  const { repository } = payload;

  console.log('payload: ', payload);

  const owner = repository.owner.login;
  const repo = repository.name;

  if (payload.issue.labels.includes(Labels.InProgress)) {
    return c.text('Ignored', 200);
  }

  // const repoCode = await getRepositoryCode(owner, repo);

  // console.log('repoCode: ', repoCode);
  //
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [
  //     {
  //       role: 'system',
  //       content: 'You are an AI assistant helping with code-related tasks.',
  //     },
  //     { role: 'user', content: `Repository code:\n${repoCode}` },
  //     {
  //       role: 'user',
  //       content: `Task title: ${title}\nTask description: ${body}`,
  //     },
  //   ],
  // });
  //
  // return c.json({ reply: response.choices[0].message.content });
  return c.text('Ignored', 200);
});

export default app;
