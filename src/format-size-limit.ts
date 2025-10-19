import prettyBytes from "pretty-bytes";

/**
 * The header for size results.
 */
const SIZE_LIMIT_RESULTS_HEADER: string[] = ["Path", "Size"];

/**
 * The header for time results.
 */
const SIZE_LIMIT_TIME_RESULTS_HEADER: string[] = [
  "Path",
  "Size",
  "Loading time (on slow 3G)",
  "Running time (on Snapdragon 410)",
  "Total time",
];

/**
 * A change.
 */
export interface Change {
  /**
   * The value of the change.
   */
  value: number;
  /**
   * Whether the change is positive.
   */
  isPositive: boolean;
  /**
   * The pretty value of the change.
   */
  pretty: string;
}

/**
 * Format a change in percentage to a human readable string.
 * @param value - The value of the change.
 * @param isPositive - Whether the change is positive.
 * @returns The formatted change.
 */
function formatChange(value: number, isPositive: boolean): Change {
  const formatted = Math.ceil(Math.abs(value) * 100) / 100;
  const emoji = isPositive ? "▲" : "▼";
  return {
    value,
    isPositive,
    pretty: `${isPositive ? "+" : "-"}${formatted}% ${emoji}`,
  };
}

/**
 * Calculate the change in percentage between two numbers.
 * @param base - The base value.
 * @param current - The current value.
 * @returns The change in percentage.
 */
export function calculateChange(base: number, current: number): Change {
  if (base === 0) {
    // If the base is 0, return a 100% increase
    return formatChange(100, true);
  }

  const value = ((current - base) / base) * 100;
  return formatChange(value, Math.sign(current - base) === 1);
}

/**
 * The result of a size-limit run.
 *
 * Results will always have a name and size, but may also have timing data if using the `@size-limit/preset-app` preset.
 */
export interface SizeLimitResult {
  /**
   * The name of the result.
   */
  name: string;
  /**
   * The size of the result.
   */
  size: number;
  /**
   * The loading time of the result.
   */
  loading?: number;
  /**
   * The running time of the result.
   */
  running?: number;
  /**
   * The total time of the result.
   */
  total?: number;
}

/**
 * An empty size result.
 */
const EMPTY_SIZE_RESULT: SizeLimitResult = {
  name: "-",
  size: 0,
};

/**
 * An empty time result.
 */
const EMPTY_TIME_RESULT: SizeLimitResult = {
  name: "-",
  size: 0,
  running: 0,
  loading: 0,
  total: 0,
};

/**
 * Format a size in bytes to a human readable string.
 * @param size - The size in bytes.
 * @returns The human readable string.
 */
function formatBytes(size: number): string {
  return prettyBytes(size) ?? "0 B";
}

/**
 * Format a time to a human readable string.
 * @param seconds - The time in seconds.
 * @returns The human readable string.
 */
function formatTime(seconds: number): string {
  if (seconds >= 1) {
    return `${Math.ceil(seconds * 10) / 10} s`;
  }

  return `${Math.ceil(seconds * 1000)} ms`;
}

/**
 * Format a line of a result.
 * @param value - The value of the line.
 * @param change - The change of the line.
 * @returns The formatted line.
 */
function formatLine(value: string | null, change: Change): string {
  return value ? `${value} (${change.pretty})` : change.pretty;
}

/**
 * Format a size result.
 * @param name - The name of the result.
 * @param base - The base result.
 * @param current - The current result.
 * @returns The formatted size result.
 */
function formatSizeResult(name: string, base: SizeLimitResult, current: SizeLimitResult): Array<string> {
  return [name, formatLine(formatBytes(current.size), calculateChange(base.size, current.size))];
}

/**
 * Format a time result.
 * @param name - The name of the result.
 * @param base - The base result.
 * @param current - The current result.
 * @returns The formatted time result.
 */
function formatTimeResult(name: string, base: SizeLimitResult, current: SizeLimitResult): Array<string> {
  return [
    name,
    formatLine(formatBytes(current.size), calculateChange(base.size, current.size)),
    formatLine(formatTime(current.loading ?? 0), calculateChange(base.loading ?? 0, current.loading ?? 0)),
    formatLine(formatTime(current.running ?? 0), calculateChange(base.running ?? 0, current.running ?? 0)),
    formatTime(current.total ?? 0),
  ];
}

/**
 * Parse the results from an existing output.
 *
 * This is for comparison with existing comment results.
 * @param output - The output to parse.
 * @returns The parsed results.
 */
export function parseResults(output: string): Record<string, SizeLimitResult> {
  const results = JSON.parse(output) as Array<{
    name: string;
    size: number;
    loading?: number;
    running?: number;
  }>;

  return results.reduce(
    (acc, result) => {
      const loading = result.loading;
      const running = result.running;
      const hasTime = loading !== undefined && running !== undefined;

      acc[result.name] = {
        name: result.name,
        size: +result.size,
        ...(hasTime && {
          loading: +loading,
          running: +running,
          total: +loading + +running,
        }),
      };

      return acc;
    },
    {} as Record<string, SizeLimitResult>,
  );
}

/**
 * Check if the result has timing.
 * @param result - The result to check.
 * @returns Whether the result has timing.
 */
function hasTimingData(result: SizeLimitResult): result is Required<SizeLimitResult> {
  return result.total !== undefined;
}

/**
 * Format the results.
 * @param base - The base results.
 * @param current - The current results.
 * @returns The formatted results.
 */
export function formatResults(
  base: { [name: string]: SizeLimitResult },
  current: { [name: string]: SizeLimitResult },
): Array<Array<string>> {
  const names = [...new Set([...Object.keys(base), ...Object.keys(current)])];
  const hasTime = names.some((name) => current[name] && hasTimingData(current[name]));
  const header = hasTime ? SIZE_LIMIT_TIME_RESULTS_HEADER : SIZE_LIMIT_RESULTS_HEADER;

  const fields = names.map((name: string) => {
    const emptyResult = hasTime ? EMPTY_TIME_RESULT : EMPTY_SIZE_RESULT;
    const baseResult = base[name] || emptyResult;
    const currentResult = current[name] || emptyResult;

    return hasTime
      ? formatTimeResult(name, baseResult, currentResult)
      : formatSizeResult(name, baseResult, currentResult);
  });

  return [header, ...fields];
}
