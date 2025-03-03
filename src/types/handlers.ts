import { ContentfulStatusCode } from 'hono/dist/types/utils/http-status'

export interface WebhookHandlerResponse {
  message: string
  status: ContentfulStatusCode
}
