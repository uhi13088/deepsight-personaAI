#!/usr/bin/env bash
# format-changed-file.sh — PostToolUse hook (Edit|Write matcher)
# 변경된 파일 하나만 prettier로 포맷한다.
# 기존 `pnpm format`(전체 프로젝트 스캔)을 대체하여 성능 개선.
# Exit 0 항상 (포맷 실패해도 무시)

set -euo pipefail

TOOL_INPUT="${TOOL_INPUT:-}"

# 입력이 없으면 종료
if [ -z "$TOOL_INPUT" ]; then
  exit 0
fi

# TOOL_INPUT JSON에서 file_path 추출
FILE=$(printf '%s' "$TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' 2>/dev/null || true)

if [ -n "$FILE" ] && [ -f "$FILE" ]; then
  prettier --write "$FILE" > /dev/null 2>&1 || true
fi

exit 0
