export interface EnvKeys {
  GITHUB_TOKEN: string
  OPENAI_API_KEY: string
  OPENAI_API_KEY_O: string
  SEARCH_KEY: string
  QUEUE: Queue
}

export type Env = {
  Bindings: EnvKeys
}
