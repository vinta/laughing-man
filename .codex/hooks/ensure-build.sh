#!/bin/bash
# Rebuilds dist/ when an apply_patch edit touches a build input.
# Called from Codex PostToolUse on Edit|Write. Receives event JSON via stdin.

PATCH=$(jq -er 'select(.tool_name == "apply_patch") | .tool_input.command // empty' 2>/dev/null) || exit 0

if ! printf '%s\n' "${PATCH}" | grep -Eq '^\*\*\* (Add File: |Delete File: |Update File: |Move to: )(.*/)?(src/|themes/|functions/|skills/laughing-man/SKILL\.md$|package\.json$|tsconfig(\.build)?\.json$)'; then
  exit 0
fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "${ROOT}" || exit 0

BUILD_OUTPUT=$(bun run build 2>&1)
BUILD_STATUS=$?
if [ "${BUILD_STATUS}" -ne 0 ]; then
  printf '%s\n' "${BUILD_OUTPUT}" >&2
  echo "PostToolUse hook: bun run build failed after a build input changed; fix the build error and rerun bun run build." >&2
  exit 2
fi

exit 0
