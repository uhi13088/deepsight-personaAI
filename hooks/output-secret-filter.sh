#!/usr/bin/env bash
# output-secret-filter.sh — PostToolUse hook
# 도구 실행 결과에서 시크릿 패턴을 감지하고 경고한다.
# Exit 0 항상 (PostToolUse에서는 실행을 차단하지 않음, 경고만 출력)

set -euo pipefail

TOOL_RESULT="${TOOL_RESULT:-}"

# 검사할 내용이 없으면 종료
if [ -z "$TOOL_RESULT" ]; then
  exit 0
fi

# 시크릿 패턴 정의 (프로젝트에서 사용 가능한 키/토큰)
SECRET_PATTERNS=(
  # API Keys & Tokens
  'sk-ant-[a-zA-Z0-9_-]{20,}'          # Anthropic API key
  'sk-[a-zA-Z0-9]{20,}'                # OpenAI-style API key
  'ghp_[a-zA-Z0-9]{36}'                # GitHub personal access token
  'gho_[a-zA-Z0-9]{36}'                # GitHub OAuth token
  'npm_[a-zA-Z0-9]{36}'                # NPM token

  # Database
  'postgres(ql)?://[^ ]*:[^ ]*@'       # PostgreSQL connection string with password
  'DATABASE_URL=.+'                     # DATABASE_URL value exposed

  # Auth / JWT
  'NEXTAUTH_SECRET=[^ ]+'              # NextAuth secret
  'JWT_SECRET=[^ ]+'                   # JWT secret
  'eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}'  # JWT token

  # Cloud providers
  'AKIA[0-9A-Z]{16}'                   # AWS Access Key ID
  'vercel_[a-zA-Z0-9_-]{24,}'          # Vercel token

  # Private keys
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
)

DETECTED=0

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$TOOL_RESULT" | grep -qE "$pattern" 2>/dev/null; then
    DETECTED=1
    break
  fi
done

if [ "$DETECTED" -eq 1 ]; then
  # 로그 기록 (실제 값은 기록하지 않음)
  LOG_DIR="${HOME}/.claude/logs"
  mkdir -p "$LOG_DIR"
  echo "[$(date -Iseconds)] SECRET_DETECTED tool=${TOOL_NAME:-unknown}" >> "${LOG_DIR}/security.log"

  # Claude에게 경고 피드백 (stdout → Claude가 읽음)
  echo "[SECURITY WARNING] Tool output contains a potential secret (API key, token, password, or connection string). Do NOT repeat, log, or reference this value. Follow CLAUDE.md: .env/.secrets reading is prohibited."
fi

exit 0
