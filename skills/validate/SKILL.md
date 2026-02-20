# validate - 전체 검증

전체 검증을 실행하고 결과를 요약합니다.

## 트리거

- 사용자가 "검증", "validate", "테스트 돌려" 등을 요청할 때
- 작업 완료 전 품질 확인이 필요할 때

## 실행 순서

### Step 1: 검증 실행

순서대로 실행하며, 앞 단계 실패 시에도 모든 단계를 실행합니다.

1. `pnpm typecheck` (TypeScript 검사)
2. `pnpm lint` (ESLint 검사)
3. `pnpm test` (테스트)
4. `pnpm build` (빌드)

### Step 2: API 문서 동기화 확인

API 관련 변경이 있었다면:

- `docs/api/*.md` 및 `*.openapi.yaml` vs 실제 라우터 불일치 여부 확인
- 불일치 발견 시 → 완료 처리 금지, 사용자에게 보고
- 의심스러우면 `/sync-check` 스킬 실행

### Step 3: 품질 체크리스트 확인

- `references/quality-checklist.md` 기준으로 코드 품질 검토
- `tasks/lessons.md`의 각 카테고리(API, Style, Testing 등)별 교훈 확인
- 현재 변경 사항이 과거 실수를 반복하지 않는지 검토

### Step 4: 결과 요약

## 출력 형식

```
## 검증 결과

| 항목 | 결과 | 상세 |
|------|------|------|
| TypeScript | PASS/FAIL | 에러 수 |
| ESLint | PASS/FAIL | 경고/에러 수 |
| 테스트 | PASS/FAIL | 통과/전체 |
| 빌드 | PASS/FAIL | - |

### 실패 항목 (있으면)
- 에러 메시지
- 수정 제안
```

## 실패 시

- TASK.md의 현재 티켓을 BLOCKED로 옮길지 제안
- 수정 방법 제시
- 수정 후 재검증 안내

## 성공 기준

- 4개 항목 모두 PASS
- API 문서 동기화 확인 완료
- lessons.md 교차 확인 완료
