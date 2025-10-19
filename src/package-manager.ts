import { detect } from "package-manager-detector/detect";

/**
 * The package manager to use.
 */
export enum PackageManager {
  Npm = "npm",
  Yarn = "yarn",
  Pnpm = "pnpm",
  Bun = "bun",
  Deno = "deno",
}

/**
 * Convert a package manager string to an enum.
 * @param packageManager - The package manager to check.
 * @returns The package manager enum if found, undefined otherwise.
 */
export function packageManagerFromStringToEnum(packageManager: string): PackageManager | undefined {
  return Object.values(PackageManager).find(
    (manager) => manager.trim().toLowerCase() === packageManager.trim().toLowerCase(),
  );
}

/**
 * Get the package manager to use.
 *
 * If no package manager is found, default to `npm`.
 * @param directory - The directory to check.
 * @returns The package manager to use.
 */
export async function getPackageManager(directory?: string): Promise<PackageManager> {
  const result = await detect({ cwd: directory });
  switch (result?.agent) {
    case "npm":
      return PackageManager.Npm;
    case "yarn":
    case "yarn@berry":
      return PackageManager.Yarn;
    case "pnpm":
    case "pnpm@6":
      return PackageManager.Pnpm;
    case "bun":
      return PackageManager.Bun;
    case "deno":
      return PackageManager.Deno;
    default:
      // If no package manager is found, default to npm
      return PackageManager.Npm;
  }
}
