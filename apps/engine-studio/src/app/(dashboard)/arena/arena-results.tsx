"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

// ── Types ────────────────────────────────────────────────────

export interface TurnIssue {
  turnNumber: number
  personaId: string
  category: "consistency" | "l2" | "paradox" | "trigger" | "voice"
  severity: "minor" | "major" | "critical"
  description: string
  suggestion: string
}

interface SessionDetail {
  session: {
    id: string
    mode: string
    topic: string
    status: string
    profileLoadLevel: string
    maxTurns: number
    budgetTokens: number
    usedTokens: number
    createdAt: string
    completedAt: string | null
    participantA: string
    participantAName: string
    participantARole: string | null
    participantB: string
    participantBName: string
    participantBRole: string | null
    extraParticipants: Array<{ id: string; name: string; role: string | null }>
  }
  turns: Array<{
    turnNumber: number
    speakerId: string
    speakerName: string
    content: string
    tokensUsed: number
    timestamp: string
  }>
  judgment: {
    method: string
    overallScore: number
    scores: {
      characterConsistency: number
      l2Emergence: number
      paradoxEmergence: number
      triggerResponse: number
    }
    issues: TurnIssue[]
    summary: string
    judgedAt: string
  } | null
  corrections: Array<{
    id: string
    personaId: string
    personaName: string
    category: string
    status: string
    reason: string
    originalContent: string
    correctedContent: string
    createdAt: string
    reviewedAt: string | null
  }>
  qualityImpact: {
    correctionsPending: number
    correctionsApproved: number
    correctionsRejected: number
    totalCorrections: number
    affectedPersonas: Array<{
      id: string
      name: string
      correctionCount: number
      approvedCount: number
    }>
  }
}

type ScoreKey = "characterConsistency" | "l2Emergence" | "paradoxEmergence" | "triggerResponse"

const JUDGMENT_SCORE_LABELS: Record<ScoreKey, { label: string; weight: number; desc: string }> = {
  characterConsistency: {
    label: "캐릭터 일관성",
    weight: 35,
    desc: "페르소나 정체성·말투·세계관이 일관되었는가",
  },
  l2Emergence: {
    label: "L2 기질 발현",
    weight: 25,
    desc: "L2 레이어의 기질·감정 패턴이 드러났는가",
  },
  paradoxEmergence: {
    label: "역설 발현",
    weight: 20,
    desc: "내면의 역설·모순이 자연스럽게 표출되었는가",
  },
  triggerResponse: { label: "트리거 반응", weight: 20, desc: "트리거 상황에 적절히 반응했는가" },
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: "text-amber-500 bg-amber-500/10",
  major: "text-orange-500 bg-orange-500/10",
  critical: "text-red-500 bg-red-500/10",
}

const CATEGORY_LABEL: Record<string, string> = {
  consistency: "일관성",
  l2: "L2 기질",
  paradox: "역설",
  trigger: "트리거",
  voice: "보이스",
}

const CORRECTION_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-500",
  APPROVED: "text-emerald-500",
  REJECTED: "text-red-400",
}

// ── 점수 바 ──────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const barColor =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-blue-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

// ── 세션 상세 보고서 패널 ─────────────────────────────────────

export function SessionDetailPanel({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = async () => {
    const res = await fetch(`/api/internal/arena/sessions/${sessionId}`)
    const json = (await res.json()) as {
      success: boolean
      data?: SessionDetail
      error?: { message: string }
    }
    if (json.success && json.data) return json.data
    throw new Error(json.error?.message ?? "로드 실패")
  }

  useEffect(() => {
    setLoading(true)
    loadDetail()
      .then(async (data) => {
        // 판정이 있고 교정이 아직 없으면 자동 교정 생성 (minor → 즉시 반영)
        if (data.judgment && data.qualityImpact.totalCorrections === 0) {
          await fetch(`/api/internal/arena/sessions/${sessionId}/corrections/generate`, {
            method: "POST",
          }).catch(() => null) // 실패해도 보고서는 표시
          // 교정 생성 후 최신 상태 다시 로드
          const refreshed = await loadDetail()
          setDetail(refreshed)
        } else {
          setDetail(data)
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "네트워크 오류"))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (loading) {
    return (
      <div className="border-t p-6">
        <p className="text-muted-foreground text-sm">보고서 로딩 중...</p>
      </div>
    )
  }
  if (error || !detail) {
    return (
      <div className="border-t p-6">
        <p className="text-sm text-red-500">{error ?? "데이터 없음"}</p>
      </div>
    )
  }

  const { session, turns, judgment, corrections, qualityImpact } = detail
  const allParticipants = [
    { id: session.participantA, name: session.participantAName },
    { id: session.participantB, name: session.participantBName },
    ...session.extraParticipants,
  ]
  const participantNameMap = new Map(allParticipants.map((p) => [p.id, p.name]))

  // 턴별 이슈 인덱스
  const issuesByTurn = new Map<number, TurnIssue[]>()
  if (judgment) {
    for (const issue of judgment.issues as TurnIssue[]) {
      const list = issuesByTurn.get(issue.turnNumber) ?? []
      list.push(issue)
      issuesByTurn.set(issue.turnNumber, list)
    }
  }

  return (
    <div className="bg-card border-t">
      <div className="space-y-6 p-6">
        {/* ── 1. 심판 판정 보고서 ─────────────────────────── */}
        {judgment ? (
          <section>
            <h4 className="mb-3 text-sm font-semibold">심판 판정 보고서</h4>

            {/* 종합 점수 히어로 */}
            <div className="mb-4 flex items-center gap-4 rounded-lg border p-4">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">종합 점수</p>
                <p
                  className={`text-4xl font-bold ${
                    judgment.overallScore >= 0.8
                      ? "text-emerald-500"
                      : judgment.overallScore >= 0.6
                        ? "text-blue-500"
                        : judgment.overallScore >= 0.4
                          ? "text-amber-500"
                          : "text-red-500"
                  }`}
                >
                  {(judgment.overallScore * 100).toFixed(0)}
                </p>
                <p className="text-muted-foreground text-[10px]">/ 100</p>
              </div>
              <div className="bg-border h-12 w-px" />
              <div className="flex-1">
                <p className="text-sm">{judgment.summary}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  판정 방식: {judgment.method === "RULE_BASED" ? "룰 기반" : "LLM"} ·{" "}
                  {new Date(judgment.judgedAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            {/* 차원별 점수 */}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                Object.entries(JUDGMENT_SCORE_LABELS) as [
                  ScoreKey,
                  (typeof JUDGMENT_SCORE_LABELS)[ScoreKey],
                ][]
              ).map(([key, meta]) => (
                <div key={key} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium">{meta.label}</p>
                    <span className="text-muted-foreground text-[10px]">가중치 {meta.weight}%</span>
                  </div>
                  <ScoreBar value={judgment.scores[key]} />
                  <p className="text-muted-foreground mt-1.5 text-[10px]">{meta.desc}</p>
                </div>
              ))}
            </div>

            {/* 이슈 없음 */}
            {(judgment.issues as TurnIssue[]).length === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                이슈 없음 — 모든 턴이 기준을 충족했습니다
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-muted-foreground text-sm">아직 판정이 완료되지 않았습니다.</p>
            </div>
          </section>
        )}

        {/* ── 2. 대화 로그 + 이슈 ──────────────────────────── */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">
            대화 로그
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              {turns.length}/{session.maxTurns}턴 · {session.usedTokens.toLocaleString()} 토큰
            </span>
          </h4>

          {turns.length === 0 ? (
            <p className="text-muted-foreground text-sm">아직 대화가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {turns.map((turn) => {
                const issues = issuesByTurn.get(turn.turnNumber) ?? []
                return (
                  <div key={turn.turnNumber} className="rounded-lg border">
                    <div className="flex items-center gap-2 border-b px-3 py-1.5">
                      <span className="text-muted-foreground text-xs">#{turn.turnNumber}</span>
                      <span className="text-xs font-medium">{turn.speakerName}</span>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {turn.tokensUsed} tok
                      </span>
                    </div>
                    <div className="px-3 py-2.5 text-sm leading-relaxed">{turn.content}</div>
                    {issues.length > 0 && (
                      <div className="space-y-1.5 border-t px-3 py-2">
                        {issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`rounded px-2 py-1.5 text-xs ${SEVERITY_COLOR[issue.severity]}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium uppercase">{issue.severity}</span>
                              <span className="opacity-60">·</span>
                              <span>{CATEGORY_LABEL[issue.category] ?? issue.category}</span>
                            </div>
                            <p className="mt-0.5 opacity-80">{issue.description}</p>
                            <p className="mt-0.5 opacity-60">→ {issue.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 3. 품질 개선 현황 ────────────────────────────── */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">
            품질 개선 현황
            {qualityImpact.totalCorrections > 0 && (
              <span className="ml-1.5 text-xs font-normal text-blue-500">
                총 {qualityImpact.totalCorrections}건
              </span>
            )}
          </h4>

          {qualityImpact.totalCorrections === 0 ? (
            <p className="text-muted-foreground text-sm">교정 요청이 없습니다.</p>
          ) : (
            <>
              {/* 페르소나별 영향 요약 */}
              <div className="mb-3 flex flex-wrap gap-2">
                {qualityImpact.affectedPersonas.map((p) => (
                  <div key={p.id} className="rounded-lg border px-3 py-2 text-xs">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-2">
                      교정 {p.correctionCount}건 (승인 {p.approvedCount}건)
                    </span>
                  </div>
                ))}
              </div>

              {/* 교정 상태 뱃지 요약 */}
              <div className="mb-3 flex gap-3 text-xs">
                {qualityImpact.correctionsPending > 0 && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                    대기 {qualityImpact.correctionsPending}
                  </span>
                )}
                {qualityImpact.correctionsApproved > 0 && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                    승인 {qualityImpact.correctionsApproved}
                  </span>
                )}
                {qualityImpact.correctionsRejected > 0 && (
                  <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-500">
                    거부 {qualityImpact.correctionsRejected}
                  </span>
                )}
              </div>

              {/* 교정 목록 */}
              <div className="space-y-2">
                {corrections.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 text-xs">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{c.personaName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABEL[c.category] ?? c.category}
                      </Badge>
                      <span className={`ml-auto font-medium ${CORRECTION_STATUS_COLOR[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.reason}</p>
                    {c.status === "APPROVED" && (
                      <div className="mt-1.5 rounded bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                        페르소나 스타일북에 반영되었습니다
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
