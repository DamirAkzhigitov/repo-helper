import OpenAI from 'openai';
import { system } from '../utils/prompt';
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';

function formatPrompt(
  title: string,
  description: string,
  codebase: string,
): ChatCompletionMessageParam[] {
  return [
    {
      role: 'user',
      content: `Your task is ${title}, full description: ${description}}`,
    },
    {
      role: 'user',
      content: 'Repository code: ' + codebase,
    },
    {
      role: 'system',
      content: system,
    },
  ];
}

export async function generateGptResponse(
  title: string,
  description: string,
  codebase: string,
  openai: OpenAI,
): Promise<string | null> {
  try {
    const messages = formatPrompt(title, description, codebase);

    const options: ChatCompletionCreateParamsNonStreaming = {
      model: 'openai/gpt-4o-mini',
      messages: messages,
      max_tokens: 10000,
    };

    const completion = await openai.chat.completions.create(options);
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating GPT response:', error);
    return null;
  }
}
