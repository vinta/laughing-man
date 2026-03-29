import { readFileSync } from "node:fs";
import type { SiteConfig, IssueData } from "../../src/types.js";
import { escapeHtml } from "./escape.js";
import { laughingManLogo } from "./logo.js";

interface IndexProps {
  issues: IssueData[];
  config: SiteConfig;
}

const styles = readFileSync(
  new URL("styles.css", import.meta.url).pathname,
  "utf8"
);

export function IndexPage({ issues, config }: IndexProps): string {
  const sorted = [...issues].sort((a, b) => b.issue - a.issue);
  const latestIssue = sorted[0];

  const listItems = sorted
    .map(
      (issue) => `
    <li>
      <a class="issue-row" href="/issues/${issue.issue}/">
        <span class="issue-number">Issue ${String(issue.issue).padStart(2, "0")}</span>
        <span class="issue-title">${escapeHtml(issue.title)}</span>
        <span class="issue-action">Open dossier</span>
      </a>
    </li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body class="index-page">
  <header class="site-header">
    <a class="site-name" href="/">${escapeHtml(config.name)}</a>
    <a class="site-link" href="#subscribe">Subscribe</a>
  </header>
  <main class="index-main">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">The Laughing Man Protocol</p>
        <h1>${escapeHtml(config.name)}</h1>
        <p class="hero-summary">
          A newsletter archive staged like a public-security case file. New dispatches arrive by
          email, while the full record stays open on the wire.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href="#subscribe">Join the next transmission</a>
          <a class="button button-secondary" href="#archive">Browse the archive</a>
        </div>
        <dl class="hero-stats" aria-label="Archive stats">
          <div>
            <dt>Issues on file</dt>
            <dd>${sorted.length}</dd>
          </div>
          <div>
            <dt>Latest dossier</dt>
            <dd>${latestIssue ? `#${latestIssue.issue}` : "Standby"}</dd>
          </div>
        </dl>
      </div>
      <div class="hero-emblem" aria-hidden="true">
        <div class="emblem-shell">
          ${laughingManLogo}
        </div>
      </div>
    </section>
    <section class="signal-strip" aria-label="Theme note">
      <p>
        Built for deliberate reading instead of endless scrolling. Each issue ships directly to the
        inbox, then lands here as part of the public archive.
      </p>
    </section>
    <section id="subscribe" class="section-block subscribe-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Direct Intake</p>
          <h2>Subscribe for the next issue.</h2>
        </div>
        <p class="section-copy">
          Receive each release as soon as it clears the wire. No feed algorithms, no timeline drift,
          just the next transmission.
        </p>
      </div>
      <form class="subscribe-form" id="subscribe-form">
        <label class="visually-hidden" for="email">Email address</label>
        <input id="email" type="email" name="email" placeholder="your@email.com" required>
        <button type="submit">Enter the channel</button>
      </form>
      <p class="subscribe-message" id="subscribe-message" hidden></p>
    </section>
    <section id="archive" class="section-block archive-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Archive Ledger</p>
          <h2>Every published issue, arranged in sequence.</h2>
        </div>
        <p class="section-copy">
          The archive stays linear and readable: issue number, title, open the dossier, continue.
        </p>
      </div>
      <ul class="issue-list" aria-label="Published issues">
        ${listItems}
      </ul>
    </section>
    <section class="section-block closing-block">
      <p class="eyebrow">Open Record</p>
      <h2>Read the archive online. Catch the next issue by email.</h2>
      <a class="button button-primary" href="#subscribe">Subscribe now</a>
    </section>
  </main>
  <script>
    document.getElementById('subscribe-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const msg = document.getElementById('subscribe-message');
      const email = form.email.value;
      form.querySelector('button').disabled = true;
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (data.ok) {
          msg.textContent = 'You are subscribed!';
          msg.className = 'subscribe-message success';
          form.reset();
        } else {
          msg.textContent = data.error || 'Something went wrong.';
          msg.className = 'subscribe-message error';
        }
      } catch {
        msg.textContent = 'Something went wrong.';
        msg.className = 'subscribe-message error';
      }
      msg.hidden = false;
      form.querySelector('button').disabled = false;
    });
  </script>
</body>
</html>`;
}
