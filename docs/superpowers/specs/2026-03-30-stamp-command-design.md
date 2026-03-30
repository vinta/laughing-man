# Design: `laughing-man stamp` command

## Problem

laughing-man requires YAML frontmatter (`issue`, `status`) in every `.md` file. Users who already have markdown files (or who just want to write markdown without learning YAML syntax) hit an error on `build`/`preview` with no guidance on how to fix it.

The tagline is "Turn your Markdown into a newsletter" but the first experience is an error about missing frontmatter.

## Solution

A new `laughing-man stamp` command that scans `.md` files in the newsletter directory, infers required frontmatter fields, and prepends them in-place. Files that already have valid frontmatter are skipped.

Additionally, when `build` or `preview` finds zero valid issues, suggest `stamp` instead of just erroring.

## What `stamp` adds

For each `.md` file missing frontmatter, prepend exactly:

```yaml
---
issue: <inferred>
status: draft
---
```

Two fields only. No `title` (already inferred from `# heading` at parse time). No `date` (only required for `ready` status, and stamp always sets `draft`).

## Issue number inference

Tried in order, first match wins:

1. **Leading number in filename**: `01-hello.md` -> 1, `3 my post.md` -> 3
2. **Number in first heading**: `# Issue 3: Hello` -> 3
3. **Fallback: file creation time order**: sort all unnumbered files by `birthtime` (ctime), assign next available integer starting from 1 (skipping any numbers already claimed by steps 1-2)

When fallback is used, print a warning so the user knows the number was guessed.

## Duplicate number handling

If two files infer the same issue number (e.g., both filenames start with `01`), the file with the earlier creation time keeps the number. The other is reassigned using the fallback strategy. Print a warning for the reassigned file.

## CLI output

```
stamped hello.md (issue: 1, status: draft)
stamped second-post.md (issue: 2, status: draft)
  warning: issue number guessed from file creation time
skipped third.md (already has frontmatter)

Stamped 2 file(s). Run `laughing-man build` to generate your newsletter.
```

## Discoverability

When `build` or `preview` encounters zero parseable issues (all `.md` files fail frontmatter validation, or no `.md` files exist), replace the current error with:

```
No issues found. Run `laughing-man stamp` to add frontmatter to your .md files.
```

This only triggers when zero issues are found, not when some files pass and others fail.

## What `stamp` does NOT do

- Does not add `title` or `date` fields
- Does not modify files that already have frontmatter (even invalid frontmatter)
- Does not validate content beyond checking for frontmatter presence
- Does not create or modify `laughing-man.yaml`
- Does not have `--dry-run` or interactive mode

## Detecting "has frontmatter"

Use `gray-matter` to parse the file. If `matter(raw).data` is a non-empty object (has at least one key), the file is considered to already have frontmatter and is skipped.

## File modifications

Frontmatter is prepended to the original file content with a single blank line separator:

```markdown
---
issue: 1
status: draft
---

# Original heading

Original content...
```

The original content is not modified in any way.

## Command registration

Add `stamp` to `src/cli.ts` in the switch statement. Help text:

```
Usage: laughing-man stamp

Add frontmatter to .md files that don't have it.
Infers issue numbers from filenames, headings, or file creation time.
All stamped issues are set to 'draft' status.
```

Add `stamp` to the main help text command list.

## Config requirement

`stamp` requires `laughing-man.yaml` to exist (to know the `issues_dir`). If config is missing, error with: `No laughing-man.yaml found. Run 'laughing-man init' first.`

## New files

- `src/commands/stamp.ts`: the command implementation
