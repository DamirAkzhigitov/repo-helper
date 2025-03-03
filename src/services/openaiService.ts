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
      content: `Your task is ${title}, full description: ${description}}`
    },
    {
      role: 'user',
      content: 'Repository code: ' + codebase
    },
    {
      role: 'system',
      content: system
    }
  ]
}

export async function generateGptResponse(
  title: string,
  description: string,
  codebase: string,
  action: Action,
  openai: OpenAI
): Promise<string | null> {
  try {
    const options: ChatCompletionCreateParamsNonStreaming = {
      model: 'google/gemini-2.0-flash-001',
      messages: formatPrompt(title, description, codebase, promptMap[action]),
      max_tokens: 10000
    }

    if (Action.Repository === action) {
      options.response_format = githubActionSchema
    }

    const completion = await openai.chat.completions.create(options)

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Error generating GPT response:', error)
    return null
  }
}
