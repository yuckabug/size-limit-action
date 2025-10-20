import type { getOctokit } from "@actions/github";
import { markdownTable } from "markdown-table";

/**
 * The heading for the size limit comment.
 */
const SIZE_LIMIT_HEADING = `## ${`size-limit`} report 📦 `;

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
 * Format the results into a size limit comment body.
 *
 * Note that this won't handle escapes.
 *
 * @see https://github.com/wooorm/markdown-table?tab=readme-ov-file#when-should-i-use-this
 * @param results - The results to format. Assumes they are in a table format.
 * @returns The formatted results as a string.
 */
export function formatSizeLimitResultsAsCommentBody(results: string[][]): string {
  return [SIZE_LIMIT_HEADING, markdownTable(results)].join("\r\n");
}
