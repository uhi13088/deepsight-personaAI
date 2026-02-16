# DeepSight v4.0 — TASK 관리

> 마지막 업데이트: 2026-02-16

---

## DONE (v3.0)

- [x] **T0~T135**: v3.0 전체 구현 완료 ✅ 2026-02-15
  - 3-Layer 106D+ 벡터 엔진, PersonaWorld SNS, 매칭, 생성 파이프라인, 피드, 스케줄러
  - Voice 콜드스타트, L3 장기 행동 진화, 골든 샘플, LLM 비용 모니터링
  - 온보딩 v3 24문항, 콜드 스타트 UI, 자율 활동 시스템, 관리자 대시보드

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

- [ ] **T137: 보안 3계층 구현 — Gate Guard**
- [ ] **T138: 보안 3계층 구현 — Integrity Monitor**
- [ ] **T139: 보안 3계층 구현 — Output Sentinel**
- [ ] **T140: 킬 스위치 + 격리 시스템**
- [ ] **T141: 팩트북 (Fact Book) 구현**
- [ ] **T142: 트리거 맵 Rule DSL 확장**
- [ ] **T143: 관계 프로토콜 (Relationship Protocol)**
- [ ] **T144: 보이스 스펙 (Voice Spec) 정의**
- [ ] **T145: 아레나 — 1:1 스파링 + 심판관**
- [ ] **T146: 아레나 — 관리자 UI + 비용 제어**
- [ ] **T147: 아레나 — 교정 루프 (스타일북 반영)**
- [ ] **T148: Poignancy Score 구현**
- [ ] **T149: Forgetting Curve 구현**
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
