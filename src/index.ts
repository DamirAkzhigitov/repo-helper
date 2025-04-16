import { Hono } from 'hono'
import { handleGithubWebhook } from './services'
import OpenAI from 'openai'
import { Octokit } from '@octokit/rest'

import type { WebhookEvent } from '@octokit/webhooks-types'
import { Env, EnvKeys } from '@/types'

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
    apiKey: token
  })

const useOctokit = (token: string) =>
  new Octokit({
    auth: token
  })

export const queue = {
  async queue(batch: any, env: EnvKeys): Promise<void> {
    const openai = getOpenai(env.OPENAI_API_KEY_O)
    const octokit = useOctokit(env.GITHUB_TOKEN)
    for (const message of batch.messages) {
      try {
        const { payload } = message.body

        await handleGithubWebhook(payload, octokit, openai)
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
