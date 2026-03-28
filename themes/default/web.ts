import { readFileSync } from "node:fs";
import type { IssueProps } from "../../src/types.js";

function getStyles(): string {
  return readFileSync(
    new URL("styles.css", import.meta.url).pathname,
    "utf8"
  );
}

export function WebPage({ title, issue, content, config }: IssueProps): string {
  const styles = getStyles();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${config.name}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <header>
      <a class="site-name" href="/">${config.name}</a>
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
