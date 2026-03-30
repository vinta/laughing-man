import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { inferIssueNumber, runStamp } from "../../src/commands/stamp";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

describe("inferIssueNumber", () => {
  it("extracts leading number from filename", () => {
    expect(inferIssueNumber("01-hello.md", "# Hello")).toEqual({
      issue: 1,
      source: "filename",
    });
  });

  it("extracts number with space separator", () => {
    expect(inferIssueNumber("3 my post.md", "# My Post")).toEqual({
      issue: 3,
      source: "filename",
    });
  });

  it("extracts number with no separator", () => {
    expect(inferIssueNumber("42post.md", "# Post")).toEqual({
      issue: 42,
      source: "filename",
    });
  });

  it("extracts number from heading when filename has no number", () => {
    expect(inferIssueNumber("hello.md", "# Issue 3: Hello")).toEqual({
      issue: 3,
      source: "heading",
    });
  });

  it("extracts number from heading with different patterns", () => {
    expect(inferIssueNumber("hello.md", "# Issue 12 My Title")).toEqual({
      issue: 12,
      source: "heading",
    });
  });

  it("prefers filename number over heading number", () => {
    expect(inferIssueNumber("5-hello.md", "# Issue 3: Hello")).toEqual({
      issue: 5,
      source: "filename",
    });
  });

  it("returns null when no number can be inferred", () => {
    expect(inferIssueNumber("hello.md", "# Hello World")).toBeNull();
  });

  it("returns null when heading is empty", () => {
    expect(inferIssueNumber("hello.md", "")).toBeNull();
  });

  it("ignores zero as issue number in filename", () => {
    expect(inferIssueNumber("0-intro.md", "# Intro")).toBeNull();
  });

  it("ignores negative numbers in filename", () => {
    expect(inferIssueNumber("-1-hello.md", "# Hello")).toBeNull();
  });
});

describe("runStamp", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), "lm-stamp-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adds frontmatter to a bare markdown file", async () => {
    writeFileSync(join(tmpDir, "01-hello.md"), "# Hello World\n\nContent.\n");

    await runStamp(tmpDir);

    const result = readFileSync(join(tmpDir, "01-hello.md"), "utf8");
    expect(result).toBe("---\nissue: 1\nstatus: draft\n---\n\n# Hello World\n\nContent.\n");
  });

  it("skips files that already have frontmatter", async () => {
    const original = "---\nissue: 1\nstatus: ready\n---\n\n# Hello\n";
    writeFileSync(join(tmpDir, "01-hello.md"), original);

    await runStamp(tmpDir);

    const result = readFileSync(join(tmpDir, "01-hello.md"), "utf8");
    expect(result).toBe(original);
  });

  it("infers issue number from heading when filename has no number", async () => {
    writeFileSync(join(tmpDir, "hello.md"), "# Issue 5: Hello World\n\nContent.\n");

    await runStamp(tmpDir);

    const result = readFileSync(join(tmpDir, "hello.md"), "utf8");
    expect(result).toStartWith("---\nissue: 5\nstatus: draft\n---\n");
  });

  it("assigns fallback numbers by file creation time", async () => {
    writeFileSync(join(tmpDir, "alpha.md"), "# Alpha\n\nFirst.\n");
    const earlier = new Date("2026-01-01");
    const later = new Date("2026-02-01");
    utimesSync(join(tmpDir, "alpha.md"), earlier, earlier);

    writeFileSync(join(tmpDir, "beta.md"), "# Beta\n\nSecond.\n");
    utimesSync(join(tmpDir, "beta.md"), later, later);

    await runStamp(tmpDir);

    const alpha = readFileSync(join(tmpDir, "alpha.md"), "utf8");
    const beta = readFileSync(join(tmpDir, "beta.md"), "utf8");
    expect(alpha).toStartWith("---\nissue: 1\nstatus: draft\n---\n");
    expect(beta).toStartWith("---\nissue: 2\nstatus: draft\n---\n");
  });

  it("skips already-claimed numbers when assigning fallbacks", async () => {
    writeFileSync(join(tmpDir, "01-first.md"), "# First\n");
    writeFileSync(join(tmpDir, "unnamed.md"), "# Unnamed\n");

    await runStamp(tmpDir);

    const unnamed = readFileSync(join(tmpDir, "unnamed.md"), "utf8");
    expect(unnamed).toStartWith("---\nissue: 2\nstatus: draft\n---\n");
  });

  it("resolves duplicate inferred numbers by creation time", async () => {
    writeFileSync(join(tmpDir, "1-alpha.md"), "# Alpha\n");
    const earlier = new Date("2026-01-01");
    const later = new Date("2026-02-01");
    utimesSync(join(tmpDir, "1-alpha.md"), earlier, earlier);

    writeFileSync(join(tmpDir, "1-beta.md"), "# Beta\n");
    utimesSync(join(tmpDir, "1-beta.md"), later, later);

    await runStamp(tmpDir);

    const alpha = readFileSync(join(tmpDir, "1-alpha.md"), "utf8");
    const beta = readFileSync(join(tmpDir, "1-beta.md"), "utf8");
    expect(alpha).toStartWith("---\nissue: 1\nstatus: draft\n---\n");
    expect(beta).toStartWith("---\nissue: 2\nstatus: draft\n---\n");
  });

  it("does not modify non-.md files", async () => {
    writeFileSync(join(tmpDir, "notes.txt"), "just notes");
    writeFileSync(join(tmpDir, "01-hello.md"), "# Hello\n");

    await runStamp(tmpDir);

    expect(readFileSync(join(tmpDir, "notes.txt"), "utf8")).toBe("just notes");
  });

  it("returns stamp results", async () => {
    writeFileSync(join(tmpDir, "01-hello.md"), "# Hello\n");
    const original = "---\nissue: 2\nstatus: ready\n---\n# Existing\n";
    writeFileSync(join(tmpDir, "02-existing.md"), original);

    const results = await runStamp(tmpDir);

    expect(results.stamped).toHaveLength(1);
    expect(results.skipped).toHaveLength(1);
    expect(results.stamped[0].filename).toBe("01-hello.md");
    expect(results.stamped[0].issue).toBe(1);
    expect(results.skipped[0].filename).toBe("02-existing.md");
  });
});
