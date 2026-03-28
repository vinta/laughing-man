# Brainstorming Handoff

## Current State

Design spec is written and needs user review before moving to implementation planning.

- **Spec file:** `docs/superpowers/specs/2026-03-28-laughing-man-design.md`
- **Next step:** User reviews the spec. Once approved, invoke the `writing-plans` skill to create the implementation plan.

## Key Decisions from Brainstorming

- **What:** CLI tool that turns markdown files into a newsletter (static archive site + email delivery)
- **Name:** `laughing-man` (Ghost in the Shell reference, matching the newsletter "The Net is Vast and Infinite")
- **Runtime:** Bun + TypeScript
- **Distribution:** npm package (`npx laughing-man`). Binary via `bun build --compile` planned for later (blocked by React Email + Bun compile bug, expected to be fixed)
- **Email templates:** React Email (`.tsx` components)
- **Email provider:** Resend (free tier)
- **Website hosting:** GitHub Pages (static site)
- **Subscribers:** Resend audience as store, with a subscribe form on the website
- **Subscribe backend:** Cloudflare Worker (source lives in this repo under `worker/`), user deploys separately
- **Content format:** Markdown with YAML frontmatter (issue number, title, date)
- **Language:** Single language per issue, no i18n in v1
- **Themes:** Built-in `themes/default/` in the package. Users override per-file by creating `./themes/default/<file>.tsx` in their newsletter directory. No `eject-theme` command.
- **Config:** `config.yaml` in user's directory. Env vars override config values for CI.
- **CI support:** `laughing-man publish 1 --yes` skips confirmation prompt. Secrets via env vars.
- **Open source:** Designed for it from day one. Provider logic isolated, config-driven, no user data in package.

## CLI Commands

```bash
laughing-man init          # Generate config.yaml
laughing-man preview       # Build site + email HTML, open in browser
laughing-man preview 2     # Preview just issue 2
laughing-man publish 1     # Deploy site + send email
laughing-man publish 1 --yes  # Non-interactive (CI)
```

## Reference Material (in of-course-i-still-love-you repo)

These were consulted as background but are NOT binding on this project:

- `docs/newsletter-interview.md` - newsletter concept, voice, audience
- `openclaw/workspace/docs/newsletter-*.md` - prior research on full platform stack (Cloudflare Workers + Neon + Resend). Much more complex than what we're building here.

## Existing Newsletter Drafts

Located at `/Users/vinta/Projects/mensab/vault/Posts/The Net is Vast and Infinite/drafts/`:
- `Issue 1 創刊號：網路是無限寬廣的！.md`
- `Issue 2.md`

These are the real content files the tool will process.
