import { readFileSync } from "node:fs";
import type { IssueProps } from "../../src/types.js";
import { escapeHtml } from "./escape.js";

const styles = readFileSync(
  new URL("styles.css", import.meta.url).pathname,
  "utf8"
);

export function WebPage({ title, issue, content, config }: IssueProps): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — ${escapeHtml(config.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;700&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <header>
      <a class="site-name" href="/">${escapeHtml(config.name)}</a>
    </header>
    <main>
      <p class="issue-meta">Issue #${issue}</p>
      ${content}
    </main>
    <footer>
      <p><a href="/">← All issues</a></p>
    </footer>
  </div>
</body>
</html>`;
}
