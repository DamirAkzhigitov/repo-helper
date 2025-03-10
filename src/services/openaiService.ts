import OpenAI from 'openai'
import { Action } from '@/enums'
import { promptMap } from '@/utils'
import { githubActionSchema } from '@/schemas'

import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from 'openai/resources/chat'

function formatPrompt(
  title: string,
  description: string,
  codebase: string,
  system: string
): ChatCompletionMessageParam[] {
  return [
    {
      role: 'user',
      content: `Our task: ${title}. Full description: ${description}}`
    },
    {
      role: 'user',
      content: 'Repository code: ' + codebase
    },
    {
      role: 'system',
      content: system
    }
  ].map((message) => ({
    ...message,
    content: message.content.replace(/\\t/g, '').replace(/\\n/g, '')
  }))
}

export async function generateGptResponse(
  title: string,
  description: string,
  codebase: string,
  action: Action,
  openai: OpenAI
): Promise<string | null> {
  try {
    const messages = formatPrompt(
      title,
      description,
      codebase,
      promptMap[action]
    )

    const options: ChatCompletionCreateParamsNonStreaming = {
      model: 'google/gemini-2.0-pro-exp-02-05:free',
      messages,
      max_tokens: 30000
      //frequency_penalty: 1,
      //presence_penalty: 1
    }

    if (action === Action.Repository) {
      options.response_format = githubActionSchema
    }

    const completion = await openai.chat.completions.create(options)

    console.log('completion: ', JSON.stringify(completion))

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Error generating GPT response:', error)
    return null
  }
}
