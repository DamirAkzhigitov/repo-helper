import OpenAI from 'openai'
import ResponseFormatJSONSchema = OpenAI.ResponseFormatJSONSchema

export const githubActionSchema: ResponseFormatJSONSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'github',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          description: 'Array of actions to perform on GitHub repository',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['create', 'delete', 'move', 'update', 'chmod'],
                description: 'Type of action to perform on the file'
              },
              sha: {
                type: 'string',
                description:
                  'sha1 value of original file, should be taken from original file'
              },
              filePath: {
                type: 'string',
                description: 'Path to the file in the repository'
              },
              content: {
                type: 'string',
                description: 'content of file, code here'
              },
              message: {
                type: 'string',
                description: 'Commit message for this change'
              }
            },
            required: ['action', 'filePath', 'message', 'content', 'sha'],
            additionalProperties: false
          }
        }
      },
      required: ['actions'],
      additionalProperties: false
    }
  }
}
