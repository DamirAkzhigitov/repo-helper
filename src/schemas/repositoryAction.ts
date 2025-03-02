export const githubActionSchema = {
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
          filePath: {
            type: 'string',
            description: 'Path to the file in the repository'
          },
          content: {
            type: 'string',
            description: 'Base64 encoded content of the file'
          },
          message: {
            type: 'string',
            description: 'Commit message for this change'
          }
        },
        required: ['action', 'filePath', 'message'],
        additionalProperties: false
      }
    }
  },
  required: ['actions'],
  additionalProperties: false
}
