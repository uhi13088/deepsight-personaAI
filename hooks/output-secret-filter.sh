#!/usr/bin/env bash
# output-secret-filter.sh — PostToolUse hook
# 도구 실행 결과에서 시크릿 패턴을 감지하고 경고한다.
# Exit 0 항상 (PostToolUse에서는 실행을 차단하지 않음, 경고만 출력)
#
# [최적화] Claude Code 내부 메시지 누적을 최소화하기 위해:
#   - 출력 크기를 제한하여 대용량 결과 처리 방지
#   - 11개 패턴을 단일 정규식으로 합쳐 grep 1회만 실행

set -euo pipefail

TOOL_RESULT="${TOOL_RESULT:-}"

# 검사할 내용이 없으면 종료
if [ -z "$TOOL_RESULT" ]; then
  exit 0
fi

# 대용량 출력은 앞부분만 검사 (4KB 제한 — 시크릿은 보통 초반에 노출됨)
SNIPPET=$(printf '%s' "$TOOL_RESULT" | head -c 4096)

# 모든 시크릿 패턴을 단일 정규식으로 합침 (grep 1회)
COMBINED_PATTERN='sk-ant-[a-zA-Z0-9_-]{20,}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|npm_[a-zA-Z0-9]{36}|postgres(ql)?://[^ ]*:[^ ]*@|DATABASE_URL=.+|NEXTAUTH_SECRET=[^ ]+|JWT_SECRET=[^ ]+|eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}|AKIA[0-9A-Z]{16}|vercel_[a-zA-Z0-9_-]{24,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'

if printf '%s' "$SNIPPET" | grep -qE "$COMBINED_PATTERN" 2>/dev/null; then
  # 로그 기록 (실제 값은 기록하지 않음)
  LOG_DIR="${HOME}/.claude/logs"
  mkdir -p "$LOG_DIR"
  echo "[$(date -Iseconds)] SECRET_DETECTED tool=${TOOL_NAME:-unknown}" >> "${LOG_DIR}/security.log"

  # Claude에게 경고 피드백 (stdout → Claude가 읽음)
  echo "[SECURITY WARNING] Tool output contains a potential secret. Do NOT repeat or reference this value."
fi

exit 0
