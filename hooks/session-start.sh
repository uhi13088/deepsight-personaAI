#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# session-start.sh — 세션 시작 시 컨텍스트 자동 로드
# ref: github.com/obra/superpowers (session-start hook)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TODAY=$(date +"%Y-%m-%d")

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          DeepSight — 세션 컨텍스트 로드                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  날짜: ${TODAY}"
echo ""

# ── 1. lessons.md 최근 교훈 표시 ──────────────────────────────
LESSONS_FILE="${PROJECT_ROOT}/tasks/lessons.md"
if [ -f "${LESSONS_FILE}" ]; then
  echo "📚 최근 교훈 (lessons.md):"
  # 항목 줄(- )을 추출해 최대 5개 표시
  grep -E "^[-*] " "${LESSONS_FILE}" 2>/dev/null | tail -5 | while IFS= read -r line; do
    echo "  ${line}"
  done
  echo ""
else
  echo "⚠️  tasks/lessons.md 없음 — 교훈 기록을 시작하세요"
  echo ""
fi

# ── 2. 현재 IN_PROGRESS 티켓 표시 ────────────────────────────
TASK_FILE="${PROJECT_ROOT}/TASK.md"
if [ -f "${TASK_FILE}" ]; then
  echo "🔥 IN_PROGRESS 티켓:"
  # IN_PROGRESS 섹션 또는 체크 안 된 항목 중 IN_PROGRESS 라벨 검색
  IN_PROGRESS=$(grep -E "IN_PROGRESS|🔥" "${TASK_FILE}" 2>/dev/null | head -3 || true)
  if [ -n "${IN_PROGRESS}" ]; then
    echo "${IN_PROGRESS}" | while IFS= read -r line; do
      echo "  ${line}"
    done
  else
    # 대안: 체크 안 된 [ ] 항목 중 최근 것
    PENDING=$(grep -E "^\s*- \[ \] \*\*T[0-9]+" "${TASK_FILE}" 2>/dev/null | head -3 || true)
    if [ -n "${PENDING}" ]; then
      echo "  (대기 중인 티켓)"
      echo "${PENDING}" | while IFS= read -r line; do
        echo "  ${line}"
      done
    else
      echo "  (없음)"
    fi
  fi
  echo ""
fi

# ── 3. 미완료 티켓 수 요약 ───────────────────────────────────
if [ -f "${TASK_FILE}" ]; then
  PENDING_COUNT=$(grep -cE "^\s*- \[ \] \*\*T[0-9]+" "${TASK_FILE}" 2>/dev/null || echo 0)
  echo "📋 대기 티켓: ${PENDING_COUNT}개"
  echo ""
fi

echo "▶ TASK.md 확인 및 lessons.md 교훈 적용 후 작업을 시작하세요."
echo ""
