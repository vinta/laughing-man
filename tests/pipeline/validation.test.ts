import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { backfillDates, validateIssues } from "../../src/pipeline/validation";
import type { IssueData } from "../../src/types";

function makeIssue(overrides: Partial<IssueData> = {}): IssueData {
  return {
    issue: 1,
    status: "ready",
    title: "My Title",
    date: "2026-03-15",
    filePath: "/newsletter/issue-1.md",
    rawContent: "# My Title\n\nContent here.",
    html: "<h1>My Title</h1><p>Content here.</p>",
    ...overrides,
  };
}

describe("validateIssues", () => {
  it("accepts valid issues with no errors", () => {
    const issues = [
      makeIssue({ issue: 1 }),
      makeIssue({ issue: 2, filePath: "/newsletter/issue-2.md" }),
    ];
    expect(() => validateIssues(issues)).not.toThrow();
  });

  it("throws on duplicate issue numbers", () => {
    const issues = [
      makeIssue({ issue: 1, filePath: "/newsletter/a.md" }),
      makeIssue({ issue: 1, filePath: "/newsletter/b.md" }),
    ];
    expect(() => validateIssues(issues)).toThrow("Duplicate issue number 1");
  });

  it("throws listing both files on duplicate", () => {
    const issues = [
      makeIssue({ issue: 1, filePath: "/newsletter/a.md" }),
      makeIssue({ issue: 1, filePath: "/newsletter/b.md" }),
    ];
    try {
      validateIssues(issues);
      expect(true).toBe(false); // should not reach here
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain("a.md");
      expect(msg).toContain("b.md");
    }
  });

  it("throws if title is missing (no # heading)", () => {
    const issues = [makeIssue({ title: "", rawContent: "No heading here." })];
    expect(() => validateIssues(issues)).toThrow("missing a # heading");
  });

  it("accepts draft issues without throwing", () => {
    const issues = [makeIssue({ status: "draft" })];
    expect(() => validateIssues(issues)).not.toThrow();
  });

  it("accepts a single ready issue", () => {
    const issues = [makeIssue({ status: "ready" })];
    expect(() => validateIssues(issues)).not.toThrow();
  });

  it("throws if ready issue is missing a date", () => {
    const issues = [makeIssue({ status: "ready", date: undefined })];
    expect(() => validateIssues(issues)).toThrow("missing a 'date' field");
  });

  it("accepts draft issues without a date", () => {
    const issues = [makeIssue({ status: "draft", date: undefined })];
    expect(() => validateIssues(issues)).not.toThrow();
  });
});

describe("backfillDates", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), "lm-backfill-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes today's date to ready issues missing a date", () => {
    const filePath = join(tmpDir, "issue-1.md");
    writeFileSync(filePath, "---\nissue: 1\nstatus: ready\n---\n\n# Hello\n");

    const issues = [makeIssue({ status: "ready", date: undefined, filePath })];
    const fixed = backfillDates(issues);

    const today = new Date().toISOString().slice(0, 10);
    expect(fixed).toHaveLength(1);
    expect(fixed[0].date).toBe(today);
    expect(issues[0].date).toBe(today);

    const updated = readFileSync(filePath, "utf8");
    expect(updated).toContain(`date: '${today}'`);
  });

  it("skips draft issues", () => {
    const filePath = join(tmpDir, "issue-2.md");
    writeFileSync(filePath, "---\nissue: 2\nstatus: draft\n---\n\n# Draft\n");

    const issues = [makeIssue({ status: "draft", date: undefined, filePath })];
    const fixed = backfillDates(issues);

    expect(fixed).toHaveLength(0);
  });

  it("skips ready issues that already have a date", () => {
    const issues = [makeIssue({ status: "ready", date: "2026-01-01" })];
    const fixed = backfillDates(issues);

    expect(fixed).toHaveLength(0);
  });
});
