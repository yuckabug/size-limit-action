import { describe, expect, test } from "bun:test";
import { type Change, calculateChange, formatResults, parseResults } from "../src/format-size-limit.ts";

describe("calculateChange", () => {
  describe("base edge case", () => {
    test("returns +100% when base is 0", () => {
      expect(calculateChange(0, 100)).toEqual({
        value: 100,
        isPositive: true,
        pretty: "+100% 🔴",
      });

      expect(calculateChange(0, 0)).toEqual({
        value: 100,
        isPositive: true,
        pretty: "+100% 🔴",
      });
    });
  });

  describe("increases", () => {
    test("calculates percentage increases with correct formatting", () => {
      expect(calculateChange(100, 150)).toEqual({
        value: 50,
        isPositive: true,
        pretty: "+50% 🔴",
      });

      expect(calculateChange(100, 200)).toEqual({
        value: 100,
        isPositive: true,
        pretty: "+100% 🔴",
      });

      expect(calculateChange(10, 1000)).toEqual({
        value: 9900,
        isPositive: true,
        pretty: "+9900% 🔴",
      });
    });

    test("handles small and fractional increases with ceiling rounding", () => {
      expect(calculateChange(1000, 1005)).toEqual({
        value: 0.5,
        isPositive: true,
        pretty: "+0.5% 🔴",
      });

      expect(calculateChange(10000, 10001).pretty).toBe("+0.01% 🔴");
      expect(calculateChange(100000, 100001).pretty).toBe("+0.01% 🔴");
    });
  });

  describe("decreases", () => {
    test("calculates percentage decreases with correct formatting", () => {
      expect(calculateChange(100, 50)).toEqual({
        value: -50,
        isPositive: false,
        pretty: "-50% 🟢",
      });

      expect(calculateChange(100, 0)).toEqual({
        value: -100,
        isPositive: false,
        pretty: "-100% 🟢",
      });

      expect(calculateChange(1000, 10)).toEqual({
        value: -99,
        isPositive: false,
        pretty: "-99% 🟢",
      });
    });

    test("handles small and fractional decreases with ceiling rounding", () => {
      expect(calculateChange(1000, 995)).toEqual({
        value: -0.5,
        isPositive: false,
        pretty: "-0.5% 🟢",
      });

      expect(calculateChange(10000, 9999).pretty).toBe("-0.01% 🟢");
      expect(calculateChange(100000, 99999).pretty).toBe("-0.01% 🟢");
    });
  });

  describe("no change", () => {
    test("returns 0% when values are equal", () => {
      expect(calculateChange(100, 100)).toEqual({
        value: 0,
        isPositive: false,
        pretty: "-0% 🟢",
      });
    });
  });

  describe("decimal precision", () => {
    test("applies ceiling rounding to 2 decimal places in pretty string", () => {
      expect(calculateChange(100, 123.456).pretty).toBe("+23.46% 🔴");
      expect(calculateChange(10000, 12300.1).pretty).toBe("+23.01% 🔴");
      expect(calculateChange(100, 150.5).pretty).toBe("+50.5% 🔴");
    });
  });

  describe("negative values", () => {
    test("handles negative base and current values correctly", () => {
      // -100 to -50: isPositive based on current > base
      expect(calculateChange(-100, -50)).toMatchObject({
        isPositive: true,
        pretty: "+50% 🔴",
      });

      // -100 to -150: isPositive based on current < base
      expect(calculateChange(-100, -150)).toMatchObject({
        isPositive: false,
        pretty: "-50% 🟢",
      });
    });

    test("handles sign transitions", () => {
      expect(calculateChange(-100, 100)).toMatchObject({
        value: -200,
        isPositive: true,
        pretty: "+200% 🔴",
      });

      expect(calculateChange(100, -100)).toMatchObject({
        value: -200,
        isPositive: false,
        pretty: "-200% 🟢",
      });
    });
  });

  describe("return type", () => {
    test("returns Change object with correct structure", () => {
      const result: Change = calculateChange(100, 150);

      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("isPositive");
      expect(result).toHaveProperty("pretty");
      expect(typeof result.value).toBe("number");
      expect(typeof result.isPositive).toBe("boolean");
      expect(typeof result.pretty).toBe("string");
    });

    test("pretty string format is valid", () => {
      expect(calculateChange(100, 150).pretty).toMatch(/^\+[\d.]+% 🔴$/);
      expect(calculateChange(100, 50).pretty).toMatch(/^-[\d.]+% 🟢$/);
    });
  });
});

describe("parseResults", () => {
  describe("size-only results", () => {
    test("parses single size-only result correctly", () => {
      const output = JSON.stringify([{ name: "index.js", size: 1024 }]);

      expect(parseResults(output)).toEqual({
        "index.js": {
          name: "index.js",
          size: 1024,
        },
      });
    });

    test("parses multiple size-only results correctly", () => {
      const output = JSON.stringify([
        { name: "index.js", size: 1024 },
        { name: "bundle.js", size: 2048 },
      ]);

      expect(parseResults(output)).toEqual({
        "index.js": {
          name: "index.js",
          size: 1024,
        },
        "bundle.js": {
          name: "bundle.js",
          size: 2048,
        },
      });
    });
  });

  describe("results with timing data", () => {
    test("parses results with loading and running times", () => {
      const output = JSON.stringify([
        {
          name: "index.js",
          size: 1024,
          loading: 1.5,
          running: 0.8,
        },
      ]);

      expect(parseResults(output)).toEqual({
        "index.js": {
          name: "index.js",
          size: 1024,
          loading: 1.5,
          running: 0.8,
          total: 2.3,
        },
      });
    });

    test("calculates total time correctly", () => {
      const output = JSON.stringify([
        {
          name: "bundle.js",
          size: 2048,
          loading: 2.5,
          running: 1.2,
        },
      ]);

      const result = parseResults(output);

      expect(result["bundle.js"]?.total).toBe(3.7);
    });

    test("parses multiple results with timing data", () => {
      const output = JSON.stringify([
        { name: "index.js", size: 1024, loading: 1.5, running: 0.8 },
        { name: "bundle.js", size: 2048, loading: 2.0, running: 1.0 },
      ]);

      expect(parseResults(output)).toEqual({
        "index.js": {
          name: "index.js",
          size: 1024,
          loading: 1.5,
          running: 0.8,
          total: 2.3,
        },
        "bundle.js": {
          name: "bundle.js",
          size: 2048,
          loading: 2.0,
          running: 1.0,
          total: 3.0,
        },
      });
    });
  });

  describe("mixed timing data", () => {
    test("only includes timing data when both loading and running are present", () => {
      const output = JSON.stringify([
        { name: "with-time.js", size: 1024, loading: 1.5, running: 0.8 },
        { name: "without-time.js", size: 2048 },
      ]);

      const results = parseResults(output);

      expect(results["with-time.js"]).toHaveProperty("total");
      expect(results["without-time.js"]).not.toHaveProperty("total");
    });

    test("does not include timing when only loading is present", () => {
      const output = JSON.stringify([{ name: "index.js", size: 1024, loading: 1.5 }]);

      const results = parseResults(output);

      expect(results["index.js"]).not.toHaveProperty("total");
    });

    test("does not include timing when only running is present", () => {
      const output = JSON.stringify([{ name: "index.js", size: 1024, running: 0.8 }]);

      const results = parseResults(output);

      expect(results["index.js"]).not.toHaveProperty("total");
    });
  });

  describe("edge cases", () => {
    test("parses empty array", () => {
      expect(parseResults("[]")).toEqual({});
    });

    test("handles numeric strings for size values", () => {
      const output = JSON.stringify([{ name: "index.js", size: "1024" }]);

      expect(parseResults(output)["index.js"]?.size).toBe(1024);
    });

    test("handles numeric strings for timing values", () => {
      const output = JSON.stringify([
        {
          name: "index.js",
          size: "1024",
          loading: "1.5",
          running: "0.8",
        },
      ]);

      const result = parseResults(output)["index.js"];

      expect(result?.loading).toBe(1.5);
      expect(result?.running).toBe(0.8);
      expect(result?.total).toBe(2.3);
    });
  });
});

describe("formatResults", () => {
  describe("size-only results", () => {
    test("formats basic size comparison with header", () => {
      const base = { "index.js": { name: "index.js", size: 1000 } };
      const current = { "index.js": { name: "index.js", size: 1500 } };

      const result = formatResults(base, current);

      expect(result[0]).toEqual(["Path", "Size"]);
      expect(result[1]?.[0]).toBe("index.js");
      expect(result[1]?.[1]).toContain("1.5 kB");
      expect(result[1]?.[1]).toContain("+50% 🔴");
    });

    test("formats multiple size comparisons", () => {
      const base = {
        "index.js": { name: "index.js", size: 1000 },
        "bundle.js": { name: "bundle.js", size: 2000 },
      };
      const current = {
        "index.js": { name: "index.js", size: 1200 },
        "bundle.js": { name: "bundle.js", size: 1800 },
      };

      const result = formatResults(base, current);

      expect(result).toHaveLength(3); // header + 2 rows
      expect(result[0]).toEqual(["Path", "Size"]);
      expect(result[1]?.[0]).toBe("index.js");
      expect(result[2]?.[0]).toBe("bundle.js");
    });

    test("handles new files not in base", () => {
      const base = {};
      const current = { "new.js": { name: "new.js", size: 1000 } };

      const result = formatResults(base, current);

      expect(result[1]?.[0]).toBe("new.js");
      expect(result[1]?.[1]).toContain("1 kB");
    });

    test("handles removed files not in current", () => {
      const base = { "removed.js": { name: "removed.js", size: 1000 } };
      const current = {};

      const result = formatResults(base, current);

      expect(result[1]?.[0]).toBe("removed.js");
      expect(result[1]?.[1]).toContain("-100% 🟢");
    });

    test("handles both new and removed files", () => {
      const base = {
        "old.js": { name: "old.js", size: 1000 },
        "common.js": { name: "common.js", size: 2000 },
      };
      const current = {
        "new.js": { name: "new.js", size: 1500 },
        "common.js": { name: "common.js", size: 2500 },
      };

      const result = formatResults(base, current);

      expect(result).toHaveLength(4); // header + 3 rows
      const names = result.slice(1).map((row) => row[0]);
      expect(names).toContain("old.js");
      expect(names).toContain("new.js");
      expect(names).toContain("common.js");
    });
  });

  describe("results with timing data", () => {
    test("formats time results with extended header", () => {
      const base = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 1.0,
          running: 0.5,
          total: 1.5,
        },
      };
      const current = {
        "index.js": {
          name: "index.js",
          size: 1200,
          loading: 1.2,
          running: 0.6,
          total: 1.8,
        },
      };

      const result = formatResults(base, current);

      expect(result[0]).toEqual(["Path", "Size", "Loading time", "Running time", "Total time"]);
    });

    test("formats time values in seconds", () => {
      const base = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 2.5,
          running: 1.8,
          total: 4.3,
        },
      };
      const current = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 2.5,
          running: 1.8,
          total: 4.3,
        },
      };

      const result = formatResults(base, current);

      expect(result[1]?.[2]).toContain("2.5 s");
      expect(result[1]?.[3]).toContain("1.8 s");
      expect(result[1]?.[4]).toBe("4.3 s");
    });

    test("formats time values in milliseconds", () => {
      const base = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 0.5,
          running: 0.3,
          total: 0.8,
        },
      };
      const current = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 0.5,
          running: 0.3,
          total: 0.8,
        },
      };

      const result = formatResults(base, current);

      expect(result[1]?.[2]).toContain("500 ms");
      expect(result[1]?.[3]).toContain("300 ms");
      expect(result[1]?.[4]).toBe("800 ms");
    });

    test("includes time changes in formatted output", () => {
      const base = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 1.0,
          running: 0.5,
          total: 1.5,
        },
      };
      const current = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 1.5,
          running: 0.75,
          total: 2.25,
        },
      };

      const result = formatResults(base, current);

      expect(result[1]?.[2]).toContain("+50% 🔴");
      expect(result[1]?.[3]).toContain("+50% 🔴");
    });
  });

  describe("mixed size and time results", () => {
    test("uses time format when any current result has timing data", () => {
      const base = {
        "index.js": { name: "index.js", size: 1000 },
      };
      const current = {
        "index.js": {
          name: "index.js",
          size: 1000,
          loading: 1.0,
          running: 0.5,
          total: 1.5,
        },
      };

      const result = formatResults(base, current);

      expect(result[0]).toHaveLength(5); // Time header has 5 columns
    });
  });

  describe("edge cases", () => {
    test("handles empty base and current", () => {
      const result = formatResults({}, {});

      expect(result).toEqual([["Path", "Size"]]);
    });

    test("handles zero sizes", () => {
      const base = { "index.js": { name: "index.js", size: 0 } };
      const current = { "index.js": { name: "index.js", size: 0 } };

      const result = formatResults(base, current);

      expect(result[1]?.[1]).toContain("0 B");
    });

    test("preserves all unique names from both base and current", () => {
      const base = {
        "a.js": { name: "a.js", size: 100 },
        "b.js": { name: "b.js", size: 200 },
      };
      const current = {
        "b.js": { name: "b.js", size: 250 },
        "c.js": { name: "c.js", size: 300 },
      };

      const result = formatResults(base, current);

      expect(result).toHaveLength(4); // header + 3 rows
      const names = result.slice(1).map((row) => row[0]);
      expect(names).toContain("a.js");
      expect(names).toContain("b.js");
      expect(names).toContain("c.js");
    });
  });
});
