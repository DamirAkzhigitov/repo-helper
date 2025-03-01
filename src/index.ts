import { Hono } from 'hono';
import { Env, IssueEvent } from './types';
import { useOpenai, useOctokit, Middleware } from './middleware';
import { handleGithubIssueWebhook } from './services';

const app = new Hono<Env>();

app.use(useOctokit);
app.use(useOpenai);

app.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as IssueEvent;
  const { openai, octokit } = c.var as Middleware;

  try {
    const result = await handleGithubIssueWebhook(payload, octokit, openai);
    return c.text(result.message, result.status);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return c.text('Internal server error', 500);
  }
});

export default app;