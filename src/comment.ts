import type { getOctokit } from "@actions/github";
import { markdownTable } from "markdown-table";

/**
 * The heading for the size limit comment.
 */
const SIZE_LIMIT_HEADING = `## size-limit report 📦 `;

/**
 * The footer for the size limit comment.
 * @see https://github.com/ai/size-limit
 */
const SIZE_LIMIT_FOOTER = `[Learn more about size-limit](https://github.com/ai/size-limit)`;

/**
 *
 * Fetch the size limit comment ID for a given pull request.
 * @param octokit - The octokit instance.
 * @param owner - The owner of the repository.
 * @param repo - The repository name.
 * @param pullRequestNumber - The number of the pull request.
 * @returns The size limit comment ID.
 */
export async function fetchSizeLimitCommentId(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
  pullRequestNumber: number,
): Promise<number | undefined> {
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullRequestNumber,
  });

  const existingComment = comments.data.find((comment) => comment.body?.startsWith(SIZE_LIMIT_HEADING));

  return existingComment?.id;
}

/**
 *
 * Create a size limit comment for a given pull request.
 * @param octokit - The octokit instance.
 * @param owner - The owner of the repository.
 * @param repo - The repository name.
 * @param pullRequestNumber - The number of the pull request.
 * @param body - The body of the comment.
 */
export async function createSizeLimitComment(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
  pullRequestNumber: number,
  body: string,
) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullRequestNumber,
    body,
  });
}

/**
 * Update a size limit comment for a given pull request.
 * @param octokit - The octokit instance.
 * @param owner - The owner of the repository.
 * @param repo - The repository name.
 * @param pullRequestNumber - The number of the pull request.
 * @param commentId - The ID of the comment.
 * @param body - The body of the comment.
 */
export async function updateSizeLimitComment(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
  pullRequestNumber: number,
  commentId: number,
  body: string,
) {
  await octokit.rest.issues.updateComment({
    owner,
    repo,
    issue_number: pullRequestNumber,
    comment_id: commentId,
    body,
  });
}

/**
 * Metadata about the comparison between base and head commits.
 */
export interface ComparisonMetadata {
  /**
   * The base branch name.
   */
  baseBranch: string;
  /**
   * The base commit hash.
   */
  baseHash: string;
  /**
   * The head branch name.
   */
  headBranch: string;
  /**
   * The head commit hash.
   */
  headHash: string;
}

/**
 * Format the results into a size limit comment body.
 *
 * Note that this won't handle escapes.
 *
 * @see https://github.com/wooorm/markdown-table?tab=readme-ov-file#when-should-i-use-this
 * @param results - The results to format. Assumes they are in a table format.
 * @param metadata - Optional comparison metadata (branch names and commit hashes).
 * @returns The formatted results as a string.
 */
export function formatSizeLimitResultsAsCommentBody(results: string[][], metadata: ComparisonMetadata): string {
  const lastUpdated = `*Last updated: ${new Date().toUTCString()}*`;

  return [
    SIZE_LIMIT_HEADING,
    markdownTable(results),
    // Exit the table and add a new line
    "",
    // Add comparison info as bullet points
    `- **Base:** \`${metadata.baseBranch}\` (\`${metadata.baseHash}\`)`,
    `- **Head:** \`${metadata.headBranch}\` (\`${metadata.headHash}\`)`,
    // Exit the bullet points and add a new line
    "",
    lastUpdated,
    SIZE_LIMIT_FOOTER,
  ].join("\r\n");
}
