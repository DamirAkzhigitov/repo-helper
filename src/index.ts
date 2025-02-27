import { Octokit } from '@octokit/rest';
import { Hono } from 'hono';
import { OpenAI } from 'openai';

const app = new Hono();

// Cloudflare Worker секреты
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getRepositoryCode(owner: string, repo: string): Promise<string> {
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
  const payload = await c.req.json();
  if (payload.action !== 'opened' || !payload.issue) {
    return c.text('Ignored', 200);
  }

  const { title, body, repository } = payload.issue;
  const owner = repository.owner.login;
  const repo = repository.name;

  const repoCode = await getRepositoryCode(owner, repo);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant helping with code-related tasks.',
      },
      { role: 'user', content: `Repository code:\n${repoCode}` },
      {
        role: 'user',
        content: `Task title: ${title}\nTask description: ${body}`,
      },
    ],
  });

  return c.json({ reply: response.choices[0].message.content });
});

export default app;
