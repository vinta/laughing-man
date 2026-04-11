import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import matter from "@11ty/gray-matter";
import { Marked } from "marked";
import markedShiki from "marked-shiki";
import { codeToHtml } from "shiki";
import { z } from "zod";
import type { IssueData } from "../types.js";
import { extractHeading } from "./heading.js";
import { inferIssueNumber } from "../commands/stamp.js";

const DEFAULT_THEME = "material-theme-lighter";

function createMarked(theme: string) {
  const instance = new Marked();
  instance.use(
    markedShiki({
      async highlight(code, lang) {
        return codeToHtml(code, {
          lang: lang || "text",
          theme,
        });
      },
    }),
  );
  return instance;
}

const FrontmatterSchema = z.object({
  issue: z.number({
    error: (iss) =>
      iss.input === undefined ? "issue is required" : "issue must be a positive integer",
  }).int().positive(),
  status: z.enum(["draft", "ready"], {
    error: (iss) =>
      iss.input === undefined
        ? "status is required"
        : `status must be 'draft' or 'ready', got '${iss.input}'`,
  }),
  title: z.string().optional(),
  date: z.preprocess(
    (val) => val instanceof Date ? val.toISOString().slice(0, 10) : val,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  ).optional(),
});

async function parseIssue(
  md: Marked,
  filePath: string,
  data: Record<string, unknown>,
  content: string,
): Promise<IssueData> {
  const result = FrontmatterSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(", ");
    throw new Error(`${filePath}: invalid frontmatter — ${messages}`);
  }

  const { issue, status, date } = result.data;
  const title = result.data.title ?? extractHeading(content);
  const html = await md.parse(content);

  return {
    issue,
    status,
    title,
    date,
    filePath,
    rawContent: content,
    html,
  };
}

export async function parseIssueFile(filePath: string, theme?: string): Promise<IssueData> {
  const { data, content } = matter(readFileSync(filePath, "utf8"));
  return parseIssue(createMarked(theme ?? DEFAULT_THEME), filePath, data, content);
}

export async function scanIssuesDir(issuesDir: string, theme?: string): Promise<IssueData[]> {
  const md = createMarked(theme ?? DEFAULT_THEME);
  const files = readdirSync(issuesDir).filter((f) => extname(f) === ".md");

  if (files.length === 0) {
    throw new Error(
      "No issues found. Run 'laughing-man stamp' to add frontmatter to your .md files."
    );
  }

  const entries = files.map((f) => {
    const filePath = join(issuesDir, f);
    const { data, content } = matter(readFileSync(filePath, "utf8"));
    return { filePath, data, content, filename: f };
  });

  // Collect issue numbers claimed by files with frontmatter
  const claimed = new Set<number>();
  for (const { data } of entries) {
    if (Object.keys(data).length > 0 && typeof data.issue === "number") {
      claimed.add(data.issue);
    }
  }

  // Auto-assign frontmatter for bare files
  const resolved = entries.map(({ filePath, data, content, filename }) => {
    if (Object.keys(data).length > 0) return { filePath, data, content };

    const heading = extractHeading(content);
    const inferred = inferIssueNumber(filename, heading);
    let issue = inferred?.issue ?? null;

    if (issue === null || claimed.has(issue)) {
      let next = 1;
      while (claimed.has(next)) next++;
      issue = next;
    }
    claimed.add(issue);

    return {
      filePath,
      data: { issue, status: "draft" as const },
      content,
    };
  });

  return Promise.all(resolved.map(({ filePath, data, content }) => parseIssue(md, filePath, data, content)));
}
