import { exec } from "@actions/exec";
import { getGitCommitHash } from "./git";
import { getPackageManager, PackageManager } from "./package-manager";

/**
 * The options for the execSizeLimit function.
 */
export interface ExecSizeLimitOptions {
  /**
   * The branch to checkout.
   *
   * @default The default branch of the repository.
   */
  branch?: string;
  /**
   * The step to skip.
   *
   * You can either skip the install step or the build step.
   */
  skipStep?: "install" | "build";
  /**
   * The build script to run.
   *
   * @default "build"
   */
  buildScript?: string;
  /**
   * The clean script to run.
   *
   * This will run after results to clean up leftover assets.
   */
  cleanScript?: string;
  /**
   * Whether to use Windows verbatim arguments.
   */
  windowsVerbatimArguments?: boolean;
  /**
   * The directory to run the script in.
   */
  directory?: string;
  /**
   * The script to run.
   *
   * @default "npx size-limit --json"
   */
  script?: string;
  /**
   * The package manager to use.
   *
   * @default `PackageManager.Npm`
   */
  packageManager?: PackageManager;
}

/**
 * The result of the execSizeLimit function.
 */
export interface ExecSizeLimitResult {
  /**
   * The status of the execution.
   */
  status: number;
  /**
   * The output of the execution.
   */
  output: string;
  /**
   * The commit hash of the execution.
   */
  commitHash: string;
}

/**
 * Execute the size limit command.
 * @param options - The options for execution.
 * @returns The status, output, and commit hash of the execution.
 */
export async function execSizeLimit(options: ExecSizeLimitOptions): Promise<ExecSizeLimitResult> {
  const {
    branch,
    skipStep,
    buildScript = "build",
    cleanScript,
    windowsVerbatimArguments,
    directory,
    script = "npx size-limit --json",
    packageManager = PackageManager.Npm,
  } = options;

  let output = "";

  // If `branch` is provided, checkout the branch
  // This is so we can compare the size limit of the base branch to the current branch
  if (branch) {
    try {
      await exec(`git fetch origin ${branch} --depth=1`);
      // Use origin/${branch} to avoid ambiguity with local files/directories that have the same name
      await exec(`git checkout -f origin/${branch}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to checkout branch ${branch}: ${message}`);
    }
  }

  const manager = packageManager || (await getPackageManager(directory));

  // If `skipStep` is not `install`, run the install command
  if (skipStep !== "install") {
    try {
      await exec(`${manager} install`, [], {
        cwd: directory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to install dependencies with ${manager}: ${message}`);
    }
  }
  // If `skipStep` is not `build`, run the build command
  if (skipStep !== "build") {
    try {
      await exec(`${manager} run ${buildScript}`, [], {
        cwd: directory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to run build script "${buildScript}" with ${manager}: ${message}`);
    }
  }

  const status = await exec(script, [], {
    windowsVerbatimArguments,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
    },
    cwd: directory,
  });

  // If `cleanScript` is provided, run the clean script
  if (cleanScript) {
    try {
      await exec(`${manager} run ${cleanScript}`, [], {
        cwd: directory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to run clean script "${cleanScript}" with ${manager}: ${message}`);
    }
  }

  // Get the current commit hash
  const commitHash = await getGitCommitHash(directory || process.cwd());

  return {
    status,
    output,
    commitHash,
  };
}
