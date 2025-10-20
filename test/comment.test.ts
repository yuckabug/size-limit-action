import { describe, expect, test } from "bun:test";
import { type ComparisonMetadata, formatSizeLimitResultsAsCommentBody } from "../src/comment";

// Note that these tests are lenient on the body formatting because the tables are formatted using `markdown-table`.

describe("formatSizeLimitResultsAsCommentBody", () => {
  test("formats results", () => {
    const results = [
      ["Path", "Size"],
      ["dist/index.js", "50 KB (+5%) 🔴"],
    ];

    const metadata: ComparisonMetadata = {
      baseBranch: "main",
      baseHash: "abc1234",
      headBranch: "feature/new-feature",
      headHash: "def5678",
    };

    const body = formatSizeLimitResultsAsCommentBody(results, metadata);

    expect(body).toContain("## size-limit report 📦");
    expect(body).toContain("- **Base:** `main` (`abc1234`)");
    expect(body).toContain("- **Head:** `feature/new-feature` (`def5678`)");
    expect(body).toContain("Path");
    expect(body).toContain("Size");
    expect(body).toContain("dist/index.js");
    expect(body).toContain("50 KB (+5%) 🔴");
    expect(body).toContain("*Last updated:");
    expect(body).toContain("[Learn more about size-limit](https://github.com/ai/size-limit)");

    // Verify the order: table comes first, then bullet points, then last updated
    const tableIndex = body.indexOf("dist/index.js");
    const baseIndex = body.indexOf("- **Base:**");
    const lastUpdatedIndex = body.indexOf("*Last updated:");
    expect(tableIndex).toBeLessThan(baseIndex);
    expect(baseIndex).toBeLessThan(lastUpdatedIndex);
  });

  test("formats results with time-based metrics and comparison metadata", () => {
    const results = [
      ["Path", "Size", "Loading time", "Running time", "Total time"],
      ["dist/index.js", "50 KB (+5%) 🔴", "1.2 s (+10%) 🔴", "500 ms (-5%) 🟢", "1.7 s"],
    ];

    const metadata: ComparisonMetadata = {
      baseBranch: "main",
      baseHash: "abc1234",
      headBranch: "add-new-feature",
      headHash: "def5678",
    };

    const body = formatSizeLimitResultsAsCommentBody(results, metadata);

    expect(body).toContain("## size-limit report 📦");
    expect(body).toContain("- **Base:** `main` (`abc1234`)");
    expect(body).toContain("- **Head:** `add-new-feature` (`def5678`)");
    expect(body).toContain("Path");
    expect(body).toContain("Size");
    expect(body).toContain("Loading time");
    expect(body).toContain("Running time");
    expect(body).toContain("Total time");
    expect(body).toContain("*Last updated:");
  });
});
