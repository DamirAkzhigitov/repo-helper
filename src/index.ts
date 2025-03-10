import { Hono } from 'hono'
import { Env } from './types'
import { handleGithubIssueWebhook } from './services'
import type { WebhookEvent } from '@octokit/webhooks-types'
import OpenAI from 'openai'
import { Octokit } from '@octokit/rest'

const app = new Hono<Env>()

app.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as WebhookEvent

  try {
    await c.env.QUEUE.send({
      payload
    })

    return c.text('Request enqueued', 202) // Accepted
  } catch (error) {
    console.error('Error in webhook handler:', error)
    return c.text('Internal server error', 500)
  }
})

const getOpenai = (token: string) =>
  new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: token,
    defaultHeaders: {
      'X-Title': 'Repo helper'
    }
  })

const useOctokit = (token: string) =>
  new Octokit({
    auth: token
  })

export const queue = {
  async queue(batch: any, env: Env): Promise<void> {
    const openai = getOpenai(env.OPENAI_API_KEY)
    const octokit = useOctokit(env.GITHUB_TOKEN)
    for (const message of batch.messages) {
      try {
        const { payload } = message.body
        const result = await handleGithubIssueWebhook(payload, octokit, openai)
        console.log(
          `Processed message: ${message.id}, Result: ${result.message}`
        )
        message.ack() // Acknowledge successful processing
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
        message.retry() // Retry the message
      }
    }
  }
}
export default {
  fetch: app.fetch,
  queue: queue.queue
}
