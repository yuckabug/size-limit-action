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
