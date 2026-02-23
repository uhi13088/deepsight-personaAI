#!/usr/bin/env bash
# db-guard.sh — PreToolUse hook (Bash matcher)
# 파괴적 SQL 명령을 감지하고 실행을 차단한다.
# Exit 0 = 허용, Exit 2 = 차단

set -euo pipefail

INPUT="${TOOL_INPUT:-}"

# 검사할 내용이 없으면 통과
if [ -z "$INPUT" ]; then
  exit 0
fi

# 대문자로 정규화
UPPER_INPUT=$(echo "$INPUT" | tr '[:lower:]' '[:upper:]')

# 파괴적 SQL 패턴 검사
BLOCKED=0
REASON=""

# DROP TABLE / DROP DATABASE / DROP SCHEMA
if echo "$UPPER_INPUT" | grep -qE 'DROP\s+(TABLE|DATABASE|SCHEMA)'; then
  BLOCKED=1
  REASON="DROP TABLE/DATABASE/SCHEMA detected"
fi

# TRUNCATE
if echo "$UPPER_INPUT" | grep -qE 'TRUNCATE\s'; then
  BLOCKED=1
  REASON="TRUNCATE detected"
fi

# DELETE FROM without WHERE
if echo "$UPPER_INPUT" | grep -qE 'DELETE\s+FROM' && ! echo "$UPPER_INPUT" | grep -qE 'DELETE\s+FROM\s+\S+\s+WHERE'; then
  BLOCKED=1
  REASON="DELETE FROM without WHERE clause detected"
fi

# ALTER TABLE ... DROP COLUMN
if echo "$UPPER_INPUT" | grep -qE 'ALTER\s+TABLE\s+\S+\s+DROP'; then
  BLOCKED=1
  REASON="ALTER TABLE DROP detected"
fi

# prisma migrate reset (destroys all data)
if echo "$UPPER_INPUT" | grep -qE 'prisma\s+migrate\s+reset'; then
  BLOCKED=1
  REASON="prisma migrate reset detected (destroys all data)"
fi

if [ "$BLOCKED" -eq 1 ]; then
  # 로그 기록
  LOG_DIR="${HOME}/.claude/logs"
  mkdir -p "$LOG_DIR"
  SNIPPET=$(echo "$INPUT" | head -c 200)
  echo "[$(date -Iseconds)] DB_GUARD_BLOCKED reason=\"${REASON}\" snippet=\"${SNIPPET}\"" >> "${LOG_DIR}/security.log"

  # 차단 메시지 (stderr → 사용자에게 표시)
  echo "[DB GUARD] Blocked: ${REASON}. This command could destroy data. Use Prisma migrations for safe schema changes, or ask the user for explicit confirmation." >&2
  exit 2
fi

exit 0
