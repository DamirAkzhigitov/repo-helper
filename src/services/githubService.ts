import { Octokit } from '@octokit/rest'
import { ignorePatterns } from '@/utils'

/**
 * Fetches the default branch of a repository
 */
export async function getDefaultBranch(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<string> {
  const {
    data: { default_branch }
  } = await octokit.repos.get({ owner, repo })
  return default_branch
}

/**
 * Gets the file tree for a repository branch
 */
export async function getRepositoryTree(
  owner: string,
  repo: string,
  branch: string,
  octokit: Octokit
) {
  const {
    data: { tree }
  } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: 'true'
  })

  return tree
}

/**
 * Checks if a file should be ignored based on predefined patterns
 */
export function shouldIgnoreFile(filePath: string): boolean {
  return ignorePatterns.some((pattern) => {
    const regex = new RegExp(pattern)
    return regex.test(filePath)
  })
}

/**
 * Fetches file content from GitHub
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  octokit: Octokit
): Promise<string> {
  const { data: fileContent } = await octokit.repos.getContent({
    owner,
    repo,
    path
  })

  // @ts-expect-error
  return Buffer.from(fileContent.content, 'base64').toString('utf-8')
}

/**
 * Adds a label to a GitHub issue
 */
export async function addLabelToIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[],
  octokit: Octokit
): Promise<void> {
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels
  })
}

/**
 * Updates a GitHub issue with new content
 */
export async function updateIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  octokit: Octokit,
  labels?: string[]
): Promise<void> {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body,
    labels
  })
}

/**
 * Fetches the complete repository code as a single string
 */
export async function getRepositoryCode(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<string> {
  try {
    const defaultBranch = await getDefaultBranch(owner, repo, octokit)

    const tree = await getRepositoryTree(owner, repo, defaultBranch, octokit)

    const combinedCode = []

    for (const file of tree) {
      file.sha
      if (file.type === 'blob' && file.path) {
        if (shouldIgnoreFile(file.path)) continue

        try {
          const content = await getFileContent(owner, repo, file.path, octokit)
          combinedCode.push([file.sha, file.path, content])
        } catch (error) {
          console.error(`Error fetching content for ${file.path}:`, error)
        }
      }
    }

    return JSON.stringify(combinedCode)
  } catch (error) {
    console.error('Error getting repository code:', error)
    throw new Error('Failed to fetch repository code')
  }
}

export async function createBranch(
  branch: string,
  baseBranch: string,
  owner: string,
  repo: string,
  octokit: Octokit
) {
  try {
    // Получаем SHA последнего коммита в основной ветке
    const { data: baseBranchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: baseBranch
    })

    const latestCommitSha = baseBranchData.commit.sha

    // Создаем новую ветку
    const { data: newRef } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: latestCommitSha
    })

    console.log(`Branch '${branch}' created successfully!`)
  } catch (error) {
    console.error('Error creating branch:', error)
  }
}
