# GitHub Webhook Worker

## Overview

This Cloudflare Worker listens for GitHub issue creation events via webhooks. When a new issue is opened, the worker:

1. Fetches the repository's code using GitHub's API.
2. Combines all files into a single string, adding file paths as comments.
3. Sends the repository code, issue title, and description to OpenAI for processing.
4. Returns OpenAI's response as a JSON reply.

## Technologies Used

- **TypeScript**
- **Cloudflare Workers**
- **Wrangler**
- **GitHub API (@octokit/rest)**
- **OpenAI API**
- **Hono (Lightweight web framework)**

## Setup Instructions

### Prerequisites

Ensure you have the following installed:

- Node.js
- Wrangler CLI (`npm install -g wrangler`)

### Environment Variables

Set up the required environment variables in your Cloudflare Worker environment:

```sh
GITHUB_TOKEN=<your_github_token>
OPENAI_API_KEY=<your_openai_api_key>
```

### Deploying the Worker

1. Clone the repository:
   ```sh
   git clone <repository_url>
   cd <project_folder>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Deploy using Wrangler:
   ```sh
   wrangler deploy
   ```

## GitHub Webhook Configuration

1. Go to your GitHub repository settings.
2. Navigate to **Webhooks** and click **Add webhook**.
3. Set the Payload URL to your deployed Cloudflare Worker URL.
4. Choose `application/json` as the content type.
5. Select the event **"Issues"** and save the webhook.

## Usage

Whenever a new issue is opened, the worker will:

- Retrieve the repository code.
- Process it with OpenAI.
- Return the AI-generated response.

## License

This project is licensed under the MIT License.

## Author

**Damir Akzhigitov**  
Email: [damir.ckelet@gmail.com](mailto:damir.ckelet@gmail.com)
