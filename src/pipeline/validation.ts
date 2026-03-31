import { readFileSync, writeFileSync } from "node:fs";
import matter from "@11ty/gray-matter";
import type { IssueData } from "../types.js";

interface BackfillResult {
  issue: number;
  filePath: string;
  date: string;
}

export function backfillDates(issues: IssueData[]): BackfillResult[] {
  const today = new Date().toISOString().slice(0, 10);
  const fixed: BackfillResult[] = [];

  for (const issue of issues) {
    if (issue.status === "ready" && !issue.date) {
      const raw = readFileSync(issue.filePath, "utf8");
      const parsed = matter(raw);
      parsed.data.date = today;
      writeFileSync(issue.filePath, matter.stringify(parsed.content, parsed.data));
      issue.date = today;
      fixed.push({ issue: issue.issue, filePath: issue.filePath, date: today });
    }
  }

  return fixed;
}

export function validateIssues(issues: IssueData[]): void {
  const errors: string[] = [];

  // Check for missing titles
  for (const issue of issues) {
    if (!issue.title.trim()) {
      errors.push(
        `Issue ${issue.issue} (${issue.filePath}) is missing a # heading`
      );
    }
  }

  // Check for ready issues missing a date
  for (const issue of issues) {
    if (issue.status === "ready" && !issue.date) {
      errors.push(
        `Issue ${issue.issue} (${issue.filePath}) has status 'ready' but is missing a 'date' field`
      );
    }
  }

  // Check for duplicate issue numbers
  const seen = new Map<number, string>();
  for (const issue of issues) {
    if (seen.has(issue.issue)) {
      errors.push(
        `Duplicate issue number ${issue.issue}: ${seen.get(issue.issue)} and ${issue.filePath}`
      );
    } else {
      seen.set(issue.issue, issue.filePath);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
