import * as path from "node:path";
import { getInput, isDebug, setFailed, warning } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
  type ComparisonMetadata,
  createSizeLimitComment,
  fetchSizeLimitCommentId,
  formatSizeLimitResultsAsCommentBody,
  updateSizeLimitComment,
} from "./comment";
import { formatResults, parseResults, type SizeLimitResult } from "./format-size-limit";
import { createWorktree, removeWorktree } from "./git";
import { type PackageManager, packageManagerFromStringToEnum } from "./package-manager";
import { execSizeLimit } from "./size-limit";

async function run(): Promise<void> {
  try {
    const { payload, repo } = context;
    const pullRequest = payload.pull_request;

    if (!pullRequest) {
      throw new Error("Only pull_request workflows are supported");
    }

    // See `action.yaml` for input descriptions
    const tokenInput = getInput("github_token", { required: true });
    const skipStepInput = getInput("skip_step", { required: false });
    const buildScriptInput = getInput("build_script", { required: false });
    const cleanScriptInput = getInput("clean_script", { required: false });
    const scriptInput = getInput("script", { required: false });
    const packageManagerInput = getInput("package_manager", { required: false });
    const directoryInput = getInput("directory", { required: false }) || process.cwd();
    const windowsVerbatimArgumentsInput = getInput("windows_verbatim_arguments", { required: false }) === "true";

    // Validate skip step
    if (skipStepInput && !["install", "build"].includes(skipStepInput)) {
      throw new Error(`Invalid skip step: ${skipStepInput}`);
    }

    // Validate package manager
    // Could be just some random string, so we need to check if it's supported
    let packageManager: PackageManager | undefined;
    if (packageManagerInput) {
      packageManager = packageManagerFromStringToEnum(packageManagerInput);
      if (!packageManager) {
        throw new Error(`Invalid package manager: ${packageManagerInput}`);
      }
    }

    const octokit = getOctokit(tokenInput);

    // For comparison, we need to:
    // 1. Execute the `size-limit` command on the base branch
    // 2. Execute the `size-limit` command on the current branch
    // We use git worktrees to run both branches in parallel for better performance

    // Create temporary directories for worktrees
    const baseWorktreePath = path.join(process.cwd(), ".git-worktree-base");
    const headWorktreePath = path.join(process.cwd(), ".git-worktree-head");

    let baseOutput: string;
    let baseHash: string;
    let status: number;
    let output: string;
    let headHash: string;

    try {
      // Create worktrees for both branches
      await Promise.all([
        createWorktree(pullRequest.base.ref, baseWorktreePath),
        createWorktree(pullRequest.head.ref, headWorktreePath),
      ]);

      // Run size-limit on both branches
      const [baseResult, headResult] = await Promise.all([
        execSizeLimit({
          branch: pullRequest.base.ref,
          skipStep: skipStepInput as "install" | "build" | undefined,
          buildScript: buildScriptInput,
          cleanScript: cleanScriptInput,
          windowsVerbatimArguments: windowsVerbatimArgumentsInput,
          directory: directoryInput,
          script: scriptInput,
          packageManager: packageManager,
          worktreeDirectory: baseWorktreePath,
        }),
        execSizeLimit({
          branch: pullRequest.head.ref,
          skipStep: skipStepInput as "install" | "build" | undefined,
          buildScript: buildScriptInput,
          cleanScript: cleanScriptInput,
          windowsVerbatimArguments: windowsVerbatimArgumentsInput,
          directory: directoryInput,
          script: scriptInput,
          packageManager: packageManager,
          worktreeDirectory: headWorktreePath,
        }),
      ]);

      baseOutput = baseResult.output;
      baseHash = baseResult.commitHash;
      status = headResult.status;
      output = headResult.output;
      headHash = headResult.commitHash;
    } finally {
      // Clean up worktrees regardless of success or failure
      await Promise.all([removeWorktree(baseWorktreePath), removeWorktree(headWorktreePath)]);
    }

    let base: Record<string, SizeLimitResult>;
    let current: Record<string, SizeLimitResult>;

    // Try to parse base results, but don't fail if it's not available
    // This allows the action to work even if the base branch doesn't have size-limit configured
    try {
      base = parseResults(baseOutput);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warning(`Could not parse base branch size-limit results. Skipping size-limit comment. ${message}`);
      return;
    }

    // Parse current results - this one must succeed
    try {
      current = parseResults(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error parsing size-limit output. The output should be a JSON. ${message}`);
    }

    // Create the comment body with comparison metadata
    const comparisonMetadata: ComparisonMetadata = {
      baseBranch: pullRequest.base.ref,
      baseHash,
      headBranch: pullRequest.head.ref,
      headHash,
    };
    const body = formatSizeLimitResultsAsCommentBody(formatResults(base, current), comparisonMetadata);
    // Check if we alrady have an existing size limit comment
    const sizeLimitComment = await fetchSizeLimitCommentId(octokit, repo.owner, repo.repo, pullRequest.number);

    if (!sizeLimitComment) {
      // If there is no existing size limit comment, we must create one
      try {
        await createSizeLimitComment(octokit, repo.owner, repo.repo, pullRequest.number, body);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warning(`Failed to create PR comment: ${message}`);
        if (isDebug() && error instanceof Error && error.stack) {
          warning(error.stack);
        }
      }
    } else {
      // If there is an existing size limit comment, we must update it
      try {
        await updateSizeLimitComment(octokit, repo.owner, repo.repo, pullRequest.number, sizeLimitComment, body);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warning(`Failed to update PR comment: ${message}`);
        if (isDebug() && error instanceof Error && error.stack) {
          warning(error.stack);
        }
      }
    }

    if (status > 0) {
      // This will be triggered if the size limit is exceeded
      setFailed("Size limit exceeded");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setFailed(message);
    if (isDebug() && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

run();
