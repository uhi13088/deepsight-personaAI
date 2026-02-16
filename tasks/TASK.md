# DeepSight v4.0 — TASK 관리

> 마지막 업데이트: 2026-02-16

---

## DONE (v3.0)

- [x] **T0~T135**: v3.0 전체 구현 완료 ✅ 2026-02-15
  - 3-Layer 106D+ 벡터 엔진, PersonaWorld SNS, 매칭, 생성 파이프라인, 피드, 스케줄러
  - Voice 콜드스타트, L3 장기 행동 진화, 골든 샘플, LLM 비용 모니터링
  - 온보딩 v3 24문항, 콜드 스타트 UI, 자율 활동 시스템, 관리자 대시보드

---

## DONE (v4.0 — 기억 지능)

- [x] **T148: Poignancy Score 구현** ✅ 2026-02-16
  - computePoignancy (6개 요인), decayPoignancy, 단위 테스트 PASS
- [x] **T141: 팩트북 (Fact Book) 구현** ✅ 2026-02-16
  - ImmutableFact CRUD, computeFactbookHash, mergeFactbooks, 단위 테스트 PASS
- [x] **T149: Forgetting Curve 구현** ✅ 2026-02-16
  - Ebbinghaus 망각 곡선, 복습 스케줄링, 적응형 난이도, 단위 테스트 PASS

## DONE (v4.0 — 보안 3계층)

- [x] **T137: 보안 3계층 구현 — Gate Guard** ✅ 2026-02-16
  - 12 인젝션 패턴, 14 금지어, 5 구조 검사, Trust Decay, 79 테스트 PASS
- [x] **T138: 보안 3계층 구현 — Integrity Monitor** ✅ 2026-02-16
  - 팩트북 해시 검증, L1 드리프트 감지, 변경 이력 제한, 집단 이상 감지, 42 테스트 PASS
- [x] **T139: 보안 3계층 구현 — Output Sentinel** ✅ 2026-02-16
  - PII 6종, 시스템 유출 8종, 비속어 4종, 팩트북 위반 감지, 격리 시스템, 45 테스트 PASS
- [x] **T140: 킬 스위치 + 격리 시스템** ✅ 2026-02-16
  - SystemSafetyConfig, 긴급 동결, 기능별 토글 6종, 자동 트리거 3종, API, 35 테스트 PASS
- [x] **T140-ext: 출처 추적 시스템 (Data Provenance)** ✅ 2026-02-16
  - InteractionSource/PostSource 추적, 신뢰도 자동 계산, 전파 감쇠, 27 테스트 PASS

---

## IN_PROGRESS

- [ ] **T136: v4.0 설계서 작성**
  - 설명: v3 아카이브 + v4.0 설계서/구현계획서 4개 문서 작성
  - AC:
    1. v3 설계서 4개 → `docs/archive/`로 이동 ✅
    2. `docs/design/persona-engine-v4.md` 작성
    3. `docs/design/persona-engine-v4-impl.md` 작성
    4. `docs/design/persona-world-v4.md` 작성
    5. `docs/design/persona-world-v4-impl.md` 작성
    6. `docs/README.md` + `CLAUDE.md` 참조 업데이트
  - 범위:
    - 보안 3계층 아키텍처 (Security Triad)
    - 캐릭터 바이블 (Character Bible) — 4 모듈
    - 아레나 (The Arena) — 심판→보고→관리자승인→자동교정
    - 기억 지능 (Memory Intelligence) — Poignancy + Forgetting Curve
    - 소셜 모듈 시스템 (Social Module System) — L4 대신 독립 모듈
    - 비용 최적화 (Cost Optimization) — 캐싱 + Batch API
    - 데이터 아키텍처 (Memory vs Instruction 분리)
    - 감정 전염 (Emotional Contagion) — 정보 없이 분위기만
    - 킬 스위치 + 격리 시스템
    - v4.0/v4.1/v4.2 로드맵

---

## QUEUE

- [x] **T142: 트리거 맵 Rule DSL 확장** ✅ 2026-02-16
  - 구조화된 표현식 (Compare/Range/Contains/AND/OR/NOT)
  - 필드 경로 해석 (L1/L2/L3/state/context)
  - 우선순위 기반 규칙 평가 + 효과 병합 + 쿨다운
  - 규칙/세트 검증 + 컴파일 + 기존 TriggerRule 호환 변환
  - 67 테스트 PASS, Build PASS
- [x] **T143: 관계 프로토콜 (Relationship Protocol)** ✅ 2026-02-16
  - 4단계 관계 발전: STRANGER→ACQUAINTANCE→FAMILIAR→CLOSE
  - 5종 관계 유형: NEUTRAL/ALLY/RIVAL/MENTOR/FAN
  - 단계+유형 기반 행동 프로토콜 (톤 허용/자기노출/논쟁 의지)
  - 단계 전환 감지, 진행률 추적, 관계 요약
  - 41 테스트 PASS, Build PASS
- [x] **T144: 보이스 스펙 (Voice Spec) 정의** ✅ 2026-02-16
  - VoiceSpec: VoiceProfile + VoiceStyleParams + 가드레일 + 적응 규칙
  - 가드레일: 금지 패턴/행동, 톤 경계 (격식도/공격성)
  - 상태 기반 적응: mood/energy/socialBattery/paradoxTension
  - 일관성 설정, 요약 생성, 경계 검사
  - 34 테스트 PASS, Build PASS
- [x] **T145: 아레나 — 1:1 스파링 + 심판관** ✅ 2026-02-16
  - ArenaSession 라이프사이클: create/start/addTurn/cancel
  - 턴 관리: getNextSpeaker (교대), getRemainingBudget, 자동 종료 (maxTurns/budget)
  - 비동기 세션 실행기: runSession (LLM DI, 에러 핸들링)
  - 룰 기반 심판: judgeSessionRuleBased (4차원 평가)
  - LLM 심판 프롬프트: buildJudgmentPrompt
  - 가중 평균 종합 점수: computeOverallScore (JUDGMENT_WEIGHTS)
  - 61 테스트 PASS, Build PASS
- [x] **T146: 아레나 — 관리자 UI + 비용 제어** ✅ 2026-02-16
  - 예산 정책: ArenaBudgetPolicy (월간/일일/세션별 한도, 경고/차단 임계)
  - 비용 추정: estimateSessionCost (프로필+턴+판정 토큰)
  - 승인 검사: checkSessionApproval (일일 한도, 토큰 한도, 월간 예산)
  - 지출 현황: computeMonthlySpending (일별 분류, 상태 판정)
  - 교정 플로우: create/approve/reject + buildCorrectionApplyResult
  - 관리자 통계: computeAdminStats (세션/판정/이슈/교정)
  - 예산 검증: validateBudgetPolicy, getBudgetAlertLevel
  - 59 테스트 PASS, Build PASS
- [x] **T147: 아레나 — 교정 루프 (스타일북 반영)** ✅ 2026-02-16
  - 교정 제안 추출: extractCorrectionSuggestions (판정 이슈 → 제안)
  - 패치 생성: buildStyleBookPatch (5카테고리별 패치 오퍼레이션)
  - 패치 검증: validatePatch (confidence, 일일 한도, 오퍼레이션 수)
  - 패치 적용: applyVoiceProfilePatch, applyStyleParamsPatch, applyFactbookPatch
  - 전체 파이프라인: executeCorrectionLoop (생성→검증→적용)
  - 과교정 감지: detectOverCorrection (일일 한도, 동일 카테고리 연속)
  - 스냅샷 diff: summarizeSnapshotDiff (전후 비교)
  - 60 테스트 PASS, Build PASS
- [ ] **T150: RAG 가중 검색 통합 (Poignancy + Forgetting)**
- [ ] **T151: 소셜 모듈 B — Connectivity (보안용)**
- [ ] **T152: 프롬프트 캐싱 적용**
- [ ] **T153: 데이터 아키텍처 — Memory vs Instruction 분리**
- [ ] **T154: ArenaSession 테이블 + 물리적 격리**
- [ ] **T155: 관리자 보안 대시보드**
- [ ] **T156: 감정 전염 (Emotional Contagion)**

---

## BLOCKED

(없음)
