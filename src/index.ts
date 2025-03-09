import { Hono } from 'hono'
import { Env } from './types'
import { useOpenai, useOctokit, Middleware } from './middleware'
import { handleGithubIssueWebhook } from './services'
import type { WebhookEvent } from '@octokit/webhooks-types'
import { handleCustomAction } from './services/customActionHandler'

const app = new Hono<Env>()

app.use(useOctokit)
app.use(useOpenai)

app.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as WebhookEvent
  const { openai, octokit } = c.var as Middleware

  try {
    const result = await handleGithubIssueWebhook(payload, octokit, openai)
    return c.text(result.message, result.status)
  } catch (error) {
    console.error('Error in webhook handler:', error)
    return c.text('Internal server error', 500)
  }
})

app.post('/custom-action', async (c) => {
  const { openai } = c.var as Middleware
  try {
    const payload = await c.req.json()
    const result = await handleCustomAction(payload, openai, c.env.GITHUB_TOKEN)
    return c.text(result.message, result.status)
  } catch (error) {
    console.error('Error in custom action handler:', error)
    return c.text(
      (error as Error).message || 'Internal server error',
      error instanceof ClientError ? 400 : 500
    )
  }
})

export default app

class ClientError extends Error {}
