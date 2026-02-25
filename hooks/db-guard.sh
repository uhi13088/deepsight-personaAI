#!/usr/bin/env bash
# db-guard.sh — PreToolUse hook (Bash matcher)
# 파괴적 SQL 명령을 감지하고 실행을 차단한다.
# Exit 0 = 허용, Exit 2 = 차단
#
# [최적화] SQL과 무관한 명령 (git, pnpm, ls 등)은 즉시 통과

set -euo pipefail

INPUT="${TOOL_INPUT:-}"

# 검사할 내용이 없으면 통과
if [ -z "$INPUT" ]; then
  exit 0
fi

# SQL과 무관한 명령은 즉시 통과 (불필요한 문자열 처리 방지)
case "$INPUT" in
  git\ *|pnpm\ *|npm\ *|npx\ *|node\ *|tsc\ *|eslint\ *|prettier\ *|ls\ *|cat\ *|head\ *|tail\ *|find\ *|grep\ *|mkdir\ *|cp\ *|mv\ *)
    exit 0
    ;;
esac

# 대문자로 정규화
UPPER_INPUT=$(printf '%s' "$INPUT" | tr '[:lower:]' '[:upper:]')

# 파괴적 패턴을 단일 검사로 통합
BLOCKED=0
REASON=""

# prisma migrate reset (대소문자 무관하게 원본으로 검사)
if printf '%s' "$INPUT" | grep -qiE 'prisma\s+migrate\s+reset'; then
  BLOCKED=1
  REASON="prisma migrate reset detected (destroys all data)"
# SQL 파괴적 패턴 (대문자 변환 후 검사)
elif printf '%s' "$UPPER_INPUT" | grep -qE 'DROP\s+(TABLE|DATABASE|SCHEMA)'; then
  BLOCKED=1
  REASON="DROP TABLE/DATABASE/SCHEMA detected"
elif printf '%s' "$UPPER_INPUT" | grep -qE 'TRUNCATE\s'; then
  BLOCKED=1
  REASON="TRUNCATE detected"
elif printf '%s' "$UPPER_INPUT" | grep -qE 'ALTER\s+TABLE\s+\S+\s+DROP'; then
  BLOCKED=1
  REASON="ALTER TABLE DROP detected"
elif printf '%s' "$UPPER_INPUT" | grep -qE 'DELETE\s+FROM' && ! printf '%s' "$UPPER_INPUT" | grep -qE 'DELETE\s+FROM\s+\S+\s+WHERE'; then
  BLOCKED=1
  REASON="DELETE FROM without WHERE clause detected"
fi

if [ "$BLOCKED" -eq 1 ]; then
  LOG_DIR="${HOME}/.claude/logs"
  mkdir -p "$LOG_DIR"
  SNIPPET=$(printf '%s' "$INPUT" | head -c 200)
  echo "[$(date -Iseconds)] DB_GUARD_BLOCKED reason=\"${REASON}\" snippet=\"${SNIPPET}\"" >> "${LOG_DIR}/security.log"

  echo "[DB GUARD] Blocked: ${REASON}. This command could destroy data. Use Prisma migrations for safe schema changes, or ask the user for explicit confirmation." >&2
  exit 2
fi

exit 0
