import type OpenAI from 'openai';
import { system } from './prompt';

export const gpt = async (
  message: string,
  codebase: string,
  openai: OpenAI,
) => {
  try {
    const options = {
      model: 'anthropic/claude-3.7-sonnet',
      messages: [
        {
          role: 'user',
          content: message,
        },
        {
          role: 'user',
          content: 'Repository code: ' + codebase,
        },
        {
          role: 'system',
          content: system,
        },
      ],
      max_tokens: 10000,
    };

    const completion = await openai.chat.completions.create(options);

    return completion.choices[0].message.content;
  } catch (e) {
    console.error(e);
    return [];
  }
};
