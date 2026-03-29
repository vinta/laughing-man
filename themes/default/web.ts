import { readFileSync } from "node:fs";
import type { IssueProps } from "../../src/types.js";
import { escapeHtml } from "./escape.js";
import { laughingManLogo } from "./logo.js";

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
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body class="issue-page">
  <header class="site-header">
    <a class="site-name" href="/">${escapeHtml(config.name)}</a>
    <a class="site-link" href="/">Archive</a>
  </header>
  <main class="issue-main">
    <section class="issue-hero">
      <div class="issue-hero-copy">
        <p class="eyebrow">Issue Dossier #${issue}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="issue-summary">
          Filed inside the Laughing Man archive. Read online here, or subscribe from the archive
          front page for the next transmission.
        </p>
      </div>
      <div class="issue-hero-emblem" aria-hidden="true">
        <div class="emblem-shell emblem-shell-small">
          ${laughingManLogo}
        </div>
      </div>
    </section>
    <section class="issue-reading-surface">
      <article class="issue-body">
        <p class="issue-meta">Issue #${issue}</p>
        ${content}
      </article>
    </section>
  </main>
  <footer class="site-footer">
    <p><a href="/">Return to the archive</a> · <a href="/#subscribe">Subscribe for the next issue</a></p>
  </footer>
</body>
</html>`;
}
