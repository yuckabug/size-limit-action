import { exec } from "@actions/exec";

/**
 * Get the current git commit hash (short form).
 * @param cwd - The working directory to run the command in.
 * @returns The commit hash.
 */
export async function getGitCommitHash(cwd: string): Promise<string> {
  let output = "";
  await exec("git", ["rev-parse", "--short", "HEAD"], {
    cwd,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
    },
    silent: true,
  });
  return output.trim();
}

/**
 * Fetch a specific branch from the remote repository with optimizations.
 * @param branch - The branch to fetch.
 * @param cwd - The working directory to run the command in.
 */
export async function fetchBranch(branch: string, cwd?: string): Promise<void> {
  try {
    await exec("git", ["fetch", "origin", branch, "--depth=1", "--no-tags"], {
      cwd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch branch ${branch}: ${message}`);
  }
}

/**
 * Create a git worktree for a specific branch in a temporary directory.
 * Note: The branch must already be fetched before calling this function.
 * @param branch - The branch to checkout in the worktree.
 * @param worktreePath - The path where the worktree should be created.
 * @param cwd - The working directory to run the command in (the main repo).
 */
export async function createWorktree(branch: string, worktreePath: string, cwd?: string): Promise<void> {
  try {
    // Create the worktree pointing to origin/${branch}
    await exec("git", ["worktree", "add", worktreePath, `origin/${branch}`], {
      cwd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create worktree for branch ${branch} at ${worktreePath}: ${message}`);
  }
}

/**
 * Remove a git worktree.
 * @param worktreePath - The path to the worktree to remove.
 * @param cwd - The working directory to run the command in (the main repo).
 */
export async function removeWorktree(worktreePath: string, cwd?: string): Promise<void> {
  try {
    // Remove the worktree
    // --force ensures it's removed even if there are uncommitted changes
    await exec("git", ["worktree", "remove", "--force", worktreePath], {
      cwd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Don't throw here - just log the error since cleanup failures shouldn't break the action
    console.warn(`Failed to remove worktree at ${worktreePath}: ${message}`);
  }
}
