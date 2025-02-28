import { createMiddleware } from 'hono/factory';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

export type Middleware = {
  octokit: Octokit;
  openai: OpenAI;
};

export const useOpenai = createMiddleware(async (c, next) => {
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: c.env.OPENAI_API_KEY,
  });

  c.set('openai', openai);

  await next();
});

export const useOctokit = createMiddleware(async (c, next) => {
  const octokit = new Octokit({
    auth: c.env.GITHUB_TOKEN,
  });

  c.set('octokit', octokit);

  await next();
});
