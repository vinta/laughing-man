# `laughing-man stamp` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `stamp` command that auto-generates frontmatter for bare markdown files, plus suggest it when `build`/`preview` finds zero issues.

**Architecture:** One new command file (`src/commands/stamp.ts`) with pure-function inference logic. One modification to `src/pipeline/markdown.ts` to make `scanIssuesDir` return a helpful error when all files fail. CLI registration in `src/cli.ts`.

**Tech Stack:** Bun, TypeScript, gray-matter (already a dependency), node:fs for stat/birthtime

---

### Task 1: Issue number inference logic

The core logic that determines what issue number a file should get. Pure functions, easy to test.

**Files:**
- Create: `src/commands/stamp.ts`
- Create: `tests/commands/stamp.test.ts`

- [ ] **Step 1: Write failing tests for `inferIssueNumber`**

```typescript
// tests/commands/stamp.test.ts
import { describe, expect, it } from "bun:test";
import { inferIssueNumber } from "../../src/commands/stamp";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/commands/stamp.test.ts`
Expected: FAIL - module `../../src/commands/stamp` not found

- [ ] **Step 3: Implement `inferIssueNumber`**

```typescript
// src/commands/stamp.ts
import { basename } from "node:path";

interface InferResult {
  issue: number;
  source: "filename" | "heading";
}

export function inferIssueNumber(
  filename: string,
  headingText: string,
): InferResult | null {
  // Strategy 1: leading number in filename
  const name = basename(filename, ".md");
  const filenameMatch = name.match(/^(\d+)/);
  if (filenameMatch) {
    const num = parseInt(filenameMatch[1], 10);
    if (num > 0) return { issue: num, source: "filename" };
  }

  // Strategy 2: "Issue N" pattern in heading
  if (headingText) {
    const headingMatch = headingText.match(/Issue\s+(\d+)/i);
    if (headingMatch) {
      const num = parseInt(headingMatch[1], 10);
      if (num > 0) return { issue: num, source: "heading" };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/commands/stamp.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

Message: `feat(stamp): add issue number inference from filename and heading`

---

### Task 2: The `runStamp` command

Reads `.md` files, detects which need frontmatter, infers issue numbers, resolves duplicates and fallbacks, writes frontmatter in-place.

**Files:**
- Modify: `src/commands/stamp.ts`
- Modify: `tests/commands/stamp.test.ts`

- [ ] **Step 1: Write failing tests for `runStamp`**

```typescript
// Add to tests/commands/stamp.test.ts
import { runStamp } from "../../src/commands/stamp";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

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
    // Create files with different birthtimes via different creation order
    writeFileSync(join(tmpDir, "alpha.md"), "# Alpha\n\nFirst.\n");
    // Shift mtime so ordering is deterministic in case birthtime is not available
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
    // Issue 1 is taken by 01-first.md, so unnamed gets 2
    expect(unnamed).toStartWith("---\nissue: 2\nstatus: draft\n---\n");
  });

  it("resolves duplicate inferred numbers by creation time", async () => {
    // Both files infer issue 1 from filename
    writeFileSync(join(tmpDir, "1-alpha.md"), "# Alpha\n");
    const earlier = new Date("2026-01-01");
    const later = new Date("2026-02-01");
    utimesSync(join(tmpDir, "1-alpha.md"), earlier, earlier);

    writeFileSync(join(tmpDir, "1-beta.md"), "# Beta\n");
    utimesSync(join(tmpDir, "1-beta.md"), later, later);

    await runStamp(tmpDir);

    const alpha = readFileSync(join(tmpDir, "1-alpha.md"), "utf8");
    const beta = readFileSync(join(tmpDir, "1-beta.md"), "utf8");
    // Alpha is older, keeps issue 1
    expect(alpha).toStartWith("---\nissue: 1\nstatus: draft\n---\n");
    // Beta gets reassigned to next available
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/commands/stamp.test.ts`
Expected: FAIL - `runStamp` is not exported

- [ ] **Step 3: Implement `runStamp`**

Add to `src/commands/stamp.ts`:

```typescript
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import matter from "@11ty/gray-matter";

// ... (inferIssueNumber from Task 1 stays as-is)

interface StampResult {
  filename: string;
  issue: number;
  warning?: string;
}

interface StampOutput {
  stamped: StampResult[];
  skipped: Array<{ filename: string }>;
}

function extractHeading(content: string): string {
  const stripped = content.replace(/^```[\s\S]*?^```/gm, "");
  const match = stripped.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

export async function runStamp(issuesDir: string): Promise<StampOutput> {
  const files = readdirSync(issuesDir)
    .filter((f) => extname(f) === ".md");

  const toStamp: Array<{
    filename: string;
    content: string;
    birthtime: Date;
    inferred: InferResult | null;
  }> = [];
  const skipped: Array<{ filename: string }> = [];

  for (const filename of files) {
    const filePath = join(issuesDir, filename);
    const raw = readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    if (Object.keys(data).length > 0) {
      skipped.push({ filename });
      continue;
    }

    const heading = extractHeading(content);
    const inferred = inferIssueNumber(filename, heading);
    const stat = statSync(filePath);

    toStamp.push({
      filename,
      content: raw,
      birthtime: stat.birthtime,
      inferred,
    });
  }

  // Resolve issue numbers: collect claimed numbers, handle duplicates
  const claimed = new Map<number, { filename: string; birthtime: Date }>();
  const needsFallback: typeof toStamp = [];

  // First pass: collect all inferred numbers, detect duplicates
  for (const file of toStamp) {
    if (!file.inferred) {
      needsFallback.push(file);
      continue;
    }

    const num = file.inferred.issue;
    const existing = claimed.get(num);

    if (!existing) {
      claimed.set(num, { filename: file.filename, birthtime: file.birthtime });
    } else if (file.birthtime < existing.birthtime) {
      // This file is older, it keeps the number; existing goes to fallback
      const displaced = toStamp.find((f) => f.filename === existing.filename)!;
      needsFallback.push(displaced);
      claimed.set(num, { filename: file.filename, birthtime: file.birthtime });
    } else {
      // Existing file is older, this one goes to fallback
      needsFallback.push(file);
    }
  }

  // Sort fallback files by birthtime
  needsFallback.sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime());

  // Assign fallback numbers
  const fallbackAssignments = new Map<string, number>();
  for (const file of needsFallback) {
    let next = 1;
    while (claimed.has(next)) next++;
    claimed.set(next, { filename: file.filename, birthtime: file.birthtime });
    fallbackAssignments.set(file.filename, next);
  }

  // Write frontmatter to files
  const stamped: StampResult[] = [];

  for (const file of toStamp) {
    const fallbackNum = fallbackAssignments.get(file.filename);
    const issue = fallbackNum ?? file.inferred!.issue;
    const warning = fallbackNum !== undefined
      ? "issue number guessed from file creation time"
      : undefined;

    const frontmatter = `---\nissue: ${issue}\nstatus: draft\n---\n\n`;
    writeFileSync(join(issuesDir, file.filename), frontmatter + file.content);

    stamped.push({ filename: file.filename, issue, warning });
  }

  stamped.sort((a, b) => a.issue - b.issue);

  return { stamped, skipped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/commands/stamp.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

Message: `feat(stamp): implement runStamp command with duplicate/fallback handling`

---

### Task 3: CLI registration

Wire `stamp` into the CLI and add help text.

**Files:**
- Modify: `src/cli.ts:1-136`
- Modify: `src/commands/stamp.ts` (add print logic)

- [ ] **Step 1: Write failing test for CLI integration**

```typescript
// Add to tests/commands/stamp.test.ts
import { loadConfig } from "../../src/pipeline/config";

describe("stamp CLI integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), "lm-stamp-cli-"));
    const config = `
name: "Test Newsletter"
issues_dir: .
web_hosting:
  provider: cloudflare-pages
  project: my-newsletter
email_hosting:
  from: "Test <test@example.com>"
  provider: resend
env: {}
`.trim();
    writeFileSync(join(tmpDir, "laughing-man.yaml"), config);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("stamps files found via config issues_dir", async () => {
    writeFileSync(join(tmpDir, "01-hello.md"), "# Hello\n");

    const config = await loadConfig(tmpDir);
    const results = await runStamp(config.issues_dir);

    expect(results.stamped).toHaveLength(1);
    expect(results.stamped[0].issue).toBe(1);

    const content = readFileSync(join(tmpDir, "01-hello.md"), "utf8");
    expect(content).toStartWith("---\nissue: 1\nstatus: draft\n---\n");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes, confirming runStamp works with config paths)**

Run: `bun test tests/commands/stamp.test.ts`
Expected: PASS (this is an integration check, the logic already works)

- [ ] **Step 3: Add CLI wiring and print output to `src/cli.ts`**

Add the import at the top of `src/cli.ts`:

```typescript
import { runStamp } from "./commands/stamp.js";
```

Add `stamp` to the main help text command list:

```
  stamp             Add frontmatter to .md files that don't have it
```

Add the `stamp` case to the switch statement (before `default`):

```typescript
case "stamp": {
  if (wantsHelp) {
    showHelp(`Usage: laughing-man stamp

Add frontmatter to .md files that don't have it.
Infers issue numbers from filenames, headings, or file creation time.
All stamped issues are set to 'draft' status.
`);
  }
  const config = await loadConfig(configDir);
  const results = await runStamp(config.issues_dir);

  for (const s of results.stamped) {
    console.log(`stamped ${s.filename} (issue: ${s.issue}, status: draft)`);
    if (s.warning) console.log(`  warning: ${s.warning}`);
  }
  for (const s of results.skipped) {
    console.log(`skipped ${s.filename} (already has frontmatter)`);
  }

  const count = results.stamped.length;
  if (count > 0) {
    console.log(`\nStamped ${count} file(s). Run \`laughing-man build\` to generate your newsletter.`);
  } else {
    console.log("No files needed stamping.");
  }
  break;
}
```

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `bun test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

Message: `feat(stamp): register stamp command in CLI`

---

### Task 4: Suggest `stamp` when build/preview finds zero issues

When `scanIssuesDir` finds `.md` files but all fail frontmatter parsing, or finds no `.md` files at all, the error message should suggest `stamp`.

**Files:**
- Modify: `src/pipeline/markdown.ts:57-60`
- Modify: `tests/pipeline/markdown.test.ts`
- Modify: `tests/commands/build.test.ts`

- [ ] **Step 1: Write failing test for the new error message**

```typescript
// Add to tests/pipeline/markdown.test.ts, inside the "scanIssuesDir" describe block
it("throws suggesting stamp when all .md files lack valid frontmatter", async () => {
  writeFileSync(join(tmpDir, "hello.md"), "# Just markdown\n\nNo frontmatter.\n");
  writeFileSync(join(tmpDir, "world.md"), "# Another file\n");

  await expect(scanIssuesDir(tmpDir)).rejects.toThrow("laughing-man stamp");
});

it("throws suggesting stamp when directory has no .md files", async () => {
  writeFileSync(join(tmpDir, "notes.txt"), "not markdown");

  await expect(scanIssuesDir(tmpDir)).rejects.toThrow("laughing-man stamp");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/pipeline/markdown.test.ts`
Expected: FAIL - error message does not contain "laughing-man stamp"

- [ ] **Step 3: Modify `scanIssuesDir` to suggest stamp**

Replace the `scanIssuesDir` function in `src/pipeline/markdown.ts`:

```typescript
export async function scanIssuesDir(issuesDir: string): Promise<IssueData[]> {
  const files = readdirSync(issuesDir).filter((f) => extname(f) === ".md");

  if (files.length === 0) {
    throw new Error(
      "No issues found. Run `laughing-man stamp` to add frontmatter to your .md files."
    );
  }

  // Check if ALL files are bare markdown (no frontmatter at all).
  // If so, suggest `stamp` instead of throwing cryptic per-file errors.
  const allBare = files.every((f) => {
    const raw = readFileSync(join(issuesDir, f), "utf8");
    return Object.keys(matter(raw).data).length === 0;
  });

  if (allBare) {
    throw new Error(
      "No issues found. Run `laughing-man stamp` to add frontmatter to your .md files."
    );
  }

  // Normal path: parse all files, let individual errors surface
  return Promise.all(files.map((f) => parseIssueFile(join(issuesDir, f))));
}
```

**Important:** This changes `scanIssuesDir` behavior. Previously it would throw on the first bad file via `Promise.all`. Now it checks whether ANY files lack frontmatter entirely (no `---` delimiters) before attempting to parse. When all files are bare markdown, it suggests `stamp`. When files have frontmatter (even invalid frontmatter), the original `Promise.all` behavior is preserved so real errors still surface.

- [ ] **Step 4: Run all tests to verify they pass**

Run: `bun test`
Expected: All tests PASS

The existing `build.test.ts` tests all use files with valid frontmatter, so they still go through the normal `Promise.all` parse path. The new tests verify the stamp suggestion for bare-markdown-only directories.

- [ ] **Step 5: Commit**

Message: `feat(stamp): suggest stamp command when no valid issues found`

---

### Task 5: Typecheck and final verification

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `bun test`
Expected: All tests PASS

- [ ] **Step 3: Manual smoke test with test newsletter**

Run: `laughing-man stamp --dir "/Users/vinta/Projects/mensab/vault/Posts/The Net is Vast and Infinite"`

Verify the output shows stamped files with inferred issue numbers from the headings ("Issue 1 ...", "Issue 2 ...", "Issue 3 ...").

**Do NOT commit the stamped files in the test newsletter.** Revert with `git checkout` if needed.

- [ ] **Step 4: Commit any fixes from above steps**

Only if steps 1-2 revealed issues that needed fixing.
