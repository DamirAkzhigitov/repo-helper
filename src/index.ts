import { Hono } from 'hono'
import { Env } from './types'
import { useOpenai, useOctokit, Middleware } from './middleware'
import { handleGithubIssueWebhook } from './services'
import type { WebhookEvent } from '@octokit/webhooks-types'

const app = new Hono<Env>()

app.use(useOctokit)
app.use(useOpenai)

app.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as WebhookEvent
  const { openai, octokit } = c.var as Middleware

  try {
    // Enqueue the long-running task
    await c.env.QUEUE.send({
      payload,
      octokit,
      openai
    })

    return c.text('Request enqueued', 202) // Accepted
  } catch (error) {
    console.error('Error in webhook handler:', error)
    return c.text('Internal server error', 500)
  }
})

// Consumer for the queue
export const queue = {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { payload, octokit, openai } = message.body
        const result = await handleGithubIssueWebhook(
          payload,
          octokit,
          openai
        )
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
  queue
}