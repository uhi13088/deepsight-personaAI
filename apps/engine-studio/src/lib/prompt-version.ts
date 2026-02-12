// ═══════════════════════════════════════════════════════════════
// Prompt Version Manager
// T53-AC2: 시맨틱 버전 관리, diff 비교, 롤백
// 스펙 §3.3.2: Major/Minor/Patch 규칙
// ═══════════════════════════════════════════════════════════════

import type { PromptType } from "./prompt-builder"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ChangeType = "MAJOR" | "MINOR" | "PATCH"

export interface PromptVersion {
  id: string
  versionString: string // "1.0.0"
  major: number
  minor: number
  patch: number
  prompts: Partial<Record<PromptType, string>>
  changeType: ChangeType
  changelog: string
  createdAt: string // ISO timestamp
}

export interface PromptDiff {
  fromVersion: string
  toVersion: string
  changes: PromptDiffEntry[]
  changeType: ChangeType
}

export interface PromptDiffEntry {
  promptType: PromptType
  type: "added" | "removed" | "modified" | "unchanged"
  oldLines?: string[]
  newLines?: string[]
}

export interface PromptVersionHistory {
  versions: PromptVersion[]
  currentVersion: string
}

// ── 시맨틱 버전 파싱 ─────────────────────────────────────────

export function parseVersion(versionString: string): {
  major: number
  minor: number
  patch: number
} {
  const parts = versionString.split(".")
  return {
    major: parseInt(parts[0] ?? "1", 10),
    minor: parseInt(parts[1] ?? "0", 10),
    patch: parseInt(parts[2] ?? "0", 10),
  }
}

export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`
}

// ── 변경 유형 자동 감지 ──────────────────────────────────────

export function detectChangeType(
  oldPrompts: Partial<Record<PromptType, string>>,
  newPrompts: Partial<Record<PromptType, string>>
): ChangeType {
  const allTypes: PromptType[] = ["base", "review", "post", "comment", "interaction"]

  // Major: 섹션(프롬프트 타입)이 추가/삭제됨
  for (const type of allTypes) {
    const hadOld = !!oldPrompts[type]?.trim()
    const hasNew = !!newPrompts[type]?.trim()
    if (hadOld !== hasNew) return "MAJOR"
  }

  // Structural changes within a prompt (section headers added/removed)
  for (const type of allTypes) {
    const oldText = oldPrompts[type] ?? ""
    const newText = newPrompts[type] ?? ""
    if (!oldText && !newText) continue

    const oldSections = extractSections(oldText)
    const newSections = extractSections(newText)

    if (oldSections.length !== newSections.length) return "MAJOR"

    const oldSet = new Set(oldSections)
    const newSet = new Set(newSections)
    for (const s of oldSet) {
      if (!newSet.has(s)) return "MAJOR"
    }
  }

  // Minor: 문장 수준의 내용 변경
  for (const type of allTypes) {
    const oldText = oldPrompts[type] ?? ""
    const newText = newPrompts[type] ?? ""
    if (oldText === newText) continue

    const oldLines = oldText.split("\n").filter((l) => l.trim())
    const newLines = newText.split("\n").filter((l) => l.trim())

    // If significant line count difference or content differs substantially
    if (Math.abs(oldLines.length - newLines.length) > 2) return "MINOR"

    let changedLines = 0
    const maxLen = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      if ((oldLines[i] ?? "") !== (newLines[i] ?? "")) changedLines++
    }
    if (changedLines > 2) return "MINOR"
  }

  // Patch: 오타 수정 수준
  return "PATCH"
}

// ── 섹션 헤더 추출 ──────────────────────────────────────────

function extractSections(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => /^\[.+\]$/.test(line.trim()))
    .map((line) => line.trim())
}

// ── 새 버전 번호 계산 ───────────────────────────────────────

export function bumpVersion(current: string, changeType: ChangeType): string {
  const { major, minor, patch } = parseVersion(current)
  switch (changeType) {
    case "MAJOR":
      return formatVersion(major + 1, 0, 0)
    case "MINOR":
      return formatVersion(major, minor + 1, 0)
    case "PATCH":
      return formatVersion(major, minor, patch + 1)
  }
}

// ── Diff 계산 ───────────────────────────────────────────────

export function calculateDiff(oldVersion: PromptVersion, newVersion: PromptVersion): PromptDiff {
  const allTypes: PromptType[] = ["base", "review", "post", "comment", "interaction"]
  const changes: PromptDiffEntry[] = []

  for (const type of allTypes) {
    const oldText = oldVersion.prompts[type] ?? ""
    const newText = newVersion.prompts[type] ?? ""

    if (!oldText && !newText) continue

    if (!oldText && newText) {
      changes.push({
        promptType: type,
        type: "added",
        newLines: newText.split("\n"),
      })
    } else if (oldText && !newText) {
      changes.push({
        promptType: type,
        type: "removed",
        oldLines: oldText.split("\n"),
      })
    } else if (oldText === newText) {
      changes.push({
        promptType: type,
        type: "unchanged",
      })
    } else {
      changes.push({
        promptType: type,
        type: "modified",
        oldLines: oldText.split("\n"),
        newLines: newText.split("\n"),
      })
    }
  }

  return {
    fromVersion: oldVersion.versionString,
    toVersion: newVersion.versionString,
    changes,
    changeType: newVersion.changeType,
  }
}

// ── 버전 히스토리 관리 ──────────────────────────────────────

export function createInitialVersion(prompts: Partial<Record<PromptType, string>>): PromptVersion {
  return {
    id: generateId(),
    versionString: "1.0.0",
    major: 1,
    minor: 0,
    patch: 0,
    prompts: { ...prompts },
    changeType: "MAJOR",
    changelog: "초기 버전 생성",
    createdAt: new Date().toISOString(),
  }
}

export function createNewVersion(
  history: PromptVersionHistory,
  newPrompts: Partial<Record<PromptType, string>>,
  changelogMessage?: string
): { version: PromptVersion; history: PromptVersionHistory } {
  const currentVersion = history.versions[history.versions.length - 1]
  if (!currentVersion) {
    const initial = createInitialVersion(newPrompts)
    return {
      version: initial,
      history: { versions: [initial], currentVersion: initial.versionString },
    }
  }

  const changeType = detectChangeType(currentVersion.prompts, newPrompts)
  const newVersionString = bumpVersion(history.currentVersion, changeType)
  const { major, minor, patch } = parseVersion(newVersionString)

  const changelog =
    changelogMessage ?? generateChangelog(changeType, currentVersion.prompts, newPrompts)

  const version: PromptVersion = {
    id: generateId(),
    versionString: newVersionString,
    major,
    minor,
    patch,
    prompts: { ...newPrompts },
    changeType,
    changelog,
    createdAt: new Date().toISOString(),
  }

  return {
    version,
    history: {
      versions: [...history.versions, version],
      currentVersion: newVersionString,
    },
  }
}

export function rollbackToVersion(
  history: PromptVersionHistory,
  targetVersionId: string
): { version: PromptVersion; history: PromptVersionHistory } | null {
  const targetVersion = history.versions.find((v) => v.id === targetVersionId)
  if (!targetVersion) return null

  return createNewVersion(
    history,
    targetVersion.prompts,
    `v${targetVersion.versionString}으로 롤백`
  )
}

// ── Changelog 자동 생성 ─────────────────────────────────────

function generateChangelog(
  changeType: ChangeType,
  oldPrompts: Partial<Record<PromptType, string>>,
  newPrompts: Partial<Record<PromptType, string>>
): string {
  const allTypes: PromptType[] = ["base", "review", "post", "comment", "interaction"]
  const changes: string[] = []

  const typeLabels: Record<PromptType, string> = {
    base: "기본",
    review: "리뷰",
    post: "포스트",
    comment: "댓글",
    interaction: "대화",
  }

  for (const type of allTypes) {
    const hadOld = !!oldPrompts[type]?.trim()
    const hasNew = !!newPrompts[type]?.trim()

    if (!hadOld && hasNew) {
      changes.push(`${typeLabels[type]} 프롬프트 추가`)
    } else if (hadOld && !hasNew) {
      changes.push(`${typeLabels[type]} 프롬프트 삭제`)
    } else if (hadOld && hasNew && oldPrompts[type] !== newPrompts[type]) {
      changes.push(`${typeLabels[type]} 프롬프트 수정`)
    }
  }

  if (changes.length === 0) return "변경 사항 없음"

  const prefix =
    changeType === "MAJOR" ? "구조 변경" : changeType === "MINOR" ? "내용 수정" : "오타 수정"
  return `[${prefix}] ${changes.join(", ")}`
}

// ── 유틸리티 ────────────────────────────────────────────────

function generateId(): string {
  return `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
