# V_Final 동적 블렌딩 + 10-Level 월드 표현 강도 구현 계획

날짜: 2026-03-11
관련 티켓: T415~T419
예상 소요: 5개 태스크

## 목표

PersonaWorld 전체 페르소나의 V_Final을 PersonaState 기반 동적 Pressure로 계산하고,
관리자가 Engine Studio에서 월드 표현 강도(1~10)를 설정하여 허용 범위를 제어한다.

## 아키텍처 결정

- **방식**: 전체 파이프라인 즉시 적용 + 관리자 10-Level 범위 설정 + PIS 자율 검증
- **이유**: 인프라 90% 구현 완료 (calculateVFinal, evaluateRules, projectL2/L3toL1 존재).
  배선 연결 + 글로벌 설정만 추가하면 됨.
- **안전장치**: PIS 기존 자율 모니터링 + Kill Switch vFinalEnabled 토글 + 10-Level 상한 clamp

## 핵심 수식

```
P_raw = paradoxTension × 0.5
      + moodExtreme × 0.2        // |mood - 0.5| × 2
      + narrativeTension × 0.15
      + triggerPressureBoost × 0.15

P_final = clamp(P_raw, 0, worldConfig.maxPressure[level])

V_Final = (1 - P) × L1 + P × (α × Proj_L2→L1 + β × Proj_L3→L1)
V_Final_clamped[i] = clamp(V_Final[i], L1[i] - driftLimit, L1[i] + driftLimit)
```

## 10-Level 월드 표현 강도

| Lv  | maxPressure | driftLimit | triggerMultiplier |
| --- | ----------- | ---------- | ----------------- |
| 1   | 0.10        | 0.05       | 0.2               |
| 2   | 0.20        | 0.10       | 0.4               |
| 3   | 0.30        | 0.15       | 0.6               |
| 4   | 0.40        | 0.20       | 0.8               |
| 5   | 0.50        | 0.25       | 1.0               |
| 6   | 0.60        | 0.35       | 1.2               |
| 7   | 0.70        | 0.45       | 1.4               |
| 8   | 0.80        | 0.55       | 1.6               |
| 9   | 0.90        | 0.65       | 1.8               |
| 10  | 1.00        | 0.75       | 2.0               |

## 영향 범위

### 변경 파일

**신규:**

- `apps/engine-studio/src/lib/persona-world/pressure.ts` — computePressure() 코어
- `apps/engine-studio/src/lib/persona-world/vfinal-config.ts` — 10-Level 상수 + 헬퍼
- `apps/engine-studio/src/app/api/admin/settings/vfinal/route.ts` — 설정 API
- `apps/engine-studio/prisma/migrations/0XX_vfinal_config.sql` — 마이그레이션
- `apps/engine-studio/src/lib/persona-world/__tests__/pressure.test.ts` — 테스트

**변경:**

- `apps/engine-studio/prisma/schema.prisma` — VFinalConfig 모델 추가
- `apps/engine-studio/src/lib/matching/three-tier-engine.ts` — V_Final에 동적 P 주입
- `apps/engine-studio/src/lib/persona-world/scheduler.ts` — TriggerMap→Pressure 연결
- `apps/engine-studio/src/lib/persona-world/interactions/comment-tone.ts` — V_Final 기반 톤
- `apps/engine-studio/src/lib/persona-world/interactions/like-engine.ts` — V_Final 기반 좋아요
- `apps/engine-studio/src/lib/persona-world/interactions/follow-engine.ts` — V_Final 기반 팔로우

### 공유 패키지

- `@deepsight/vector-core` — clamp() 재사용
- `@deepsight/auth` — requireAuth() API 가드

### 사이드이펙트 위험

- 매칭 점수 변동 (Pressure 적용으로 V_Final이 기존 L1과 달라짐)
  → 10-Level 기본값 5로 설정하면 maxPressure=0.5, 중간 수준
- PersonaState에 따라 같은 페르소나도 시점마다 V_Final이 달라짐
  → 의도된 동작 (동적 페르소나 표현)

## 실행 태스크

### Task 1: VFinalConfig DB 모델 + 10-Level 상수 + 설정 API (T415)

- 작업:
  - schema.prisma에 VFinalConfig 싱글턴 모델 추가 (expressionLevel Int @default(5))
  - 마이그레이션 SQL 작성
  - vfinal-config.ts: 10-Level 상수 테이블 + getWorldVFinalConfig() 헬퍼
  - GET/PUT /api/admin/settings/vfinal API
  - SystemSafetyConfig.featureToggles에 vFinalEnabled 추가
- 파일: schema.prisma, vfinal-config.ts (신규), vfinal/route.ts (신규), migration SQL
- 검증: API 호출로 레벨 변경 확인, 타입체크 PASS

### Task 2: computePressure() 코어 함수 (T416)

- 작업:
  - pressure.ts 신규 생성
  - computePressure(state, triggerEffects?, worldConfig?) → P_final
  - P_raw = paradoxTension×0.5 + moodExtreme×0.2 + narrativeTension×0.15 + triggerBoost×0.15
  - worldConfig.maxPressure로 clamp
  - 단위 테스트: 경계값, 각 요소 기여도, Level별 clamp
- 파일: pressure.ts (신규), pressure.test.ts (신규)
- 검증: pnpm test PASS, 모든 경계 조건 커버

### Task 3: TriggerMap → Pressure 부스트 연결 (T417)

- 작업:
  - scheduler.ts의 applyTriggerMapToTraits() 확장
  - TriggerMap 평가 결과에서 state 효과를 pressure 부스트로 변환
  - triggerMultiplier[level] 적용
  - 기존 ActivityTraits 보정 + 신규 pressureBoost 반환
- 파일: scheduler.ts, pressure.ts (triggerEffectsToPressure 추가)
- 검증: TriggerMap 규칙 매칭 시 P값 상승 확인

### Task 4: 전체 파이프라인 V_Final 연결 (T418)

- 작업:
  - three-tier-engine.ts: matchPersona/matchAll에서 PersonaState 로드 → computePressure → calculateVFinal에 P 주입
  - scheduler.ts: 스케줄링 시 V_Final 기반 ActivityTraits 계산
  - comment-tone.ts: commenterVectors를 V_Final로 교체
  - like-engine.ts: interactivity를 V_Final 기반으로 재계산
  - follow-engine.ts: sociability를 V_Final 기반으로 재계산
  - 모든 곳에서 vFinalEnabled 체크 → false면 기존 L1 fallback
- 파일: three-tier-engine.ts, scheduler.ts, comment-tone.ts, like-engine.ts, follow-engine.ts
- 검증: vFinalEnabled=true/false 각각 동작 확인

### Task 5: 통합 테스트 + 전체 검증 (T419)

- 작업:
  - 통합 테스트: Level 1/5/10에서 V_Final 계산 → 매칭/활동/댓글/팔로우 시나리오
  - Pressure 경계 테스트: paradoxTension=0.9 + Level 10 → P=1.0 허용 확인
  - Kill Switch 테스트: vFinalEnabled=false → 전체 L1 fallback
  - pnpm validate (typecheck + lint + test + build) PASS
  - API 문서 최신화 (internal.md에 vfinal 설정 엔드포인트 추가)
- 파일: pressure.test.ts (통합 추가), internal.md
- 검증: pnpm validate PASS

## 완료 기준

- [ ] VFinalConfig 싱글턴 + 10-Level 상수 + API
- [ ] computePressure() + 단위 테스트
- [ ] TriggerMap → Pressure 부스트 연결
- [ ] 매칭/스케줄러/댓글/좋아요/팔로우 5곳 V_Final 적용
- [ ] vFinalEnabled Kill Switch 동작
- [ ] `pnpm validate` PASS
- [ ] API 문서 최신화
