# sync-check - API 문서 / DB 스키마 불일치 감지

API 문서와 DB 스키마가 실제 코드와 일치하는지 확인합니다.

## 트리거

- 사용자가 "sync-check", "문서 확인", "불일치 확인" 등을 요청할 때
- API/DB 관련 작업 시작 전 의심스러울 때
- API 변경 후 문서 최신화 확인이 필요할 때

---

## 실행 순서

### Step 1: 문서 로드

1. `docs/api/external-v1.md` — External B2B API
2. `docs/api/internal.md` — Internal Admin API
3. `docs/api/public.md` — Public (PersonaWorld) API
4. `docs/api/*.openapi.yaml` — OpenAPI 스펙
5. `prisma/schema.prisma` — DB 스키마 (SSoT)
6. `docs/CHANGELOG_SCHEMA.md` — 스키마 변경 이력

### Step 2: API 문서 대조

```bash
# 실제 API 라우터 전체 목록
find apps/engine-studio/src/app/api -name "route.ts" | sort

# 각 엔드포인트 핸들러 목록
grep -r "export.*GET\|export.*POST\|export.*PUT\|export.*DELETE" apps/engine-studio/src/app/api/
```

**대조 항목:**

- [ ] `docs/api/*.md`의 엔드포인트가 실제 라우터에 존재하는가?
- [ ] 실제 라우터에 있는데 `docs/api/*.md`에 없는 엔드포인트는?
- [ ] 응답 필드명이 문서와 일치하는가?
- [ ] 공통 응답 형식(`{ success, data, error }`)을 준수하는가?

### Step 3: DB 스키마 대조

```bash
# Prisma 스키마 확인 (SSoT)
cat apps/engine-studio/prisma/schema.prisma
```

**대조 항목:**

- [ ] API 문서에서 참조하는 필드명이 Prisma 스키마와 일치하는가?
- [ ] 새로 추가/삭제된 모델이 API 문서에 반영되었는가?

### Step 4: 결과 보고

불일치 없음:

```
✅ 동기화 확인 완료
- API 문서: 일치
- DB 스키마: 일치
- 작업 진행 가능
```

불일치 발견:

```
⚠️ 불일치 발견 - 작업 중단

[API 문서 불일치]
- docs/api/internal.md에 없는 라우터: POST /api/internal/new-endpoint
→ 문서 업데이트 or 라우터 제거 여부 사용자 확인 필요

[DB 스키마 불일치]
- API 문서의 필드명 user.username → Prisma 실제: user.name
→ 어느 쪽이 최신인지 사용자 확인 필요
```

### Step 5: 불일치 해소 (사용자 확인 후)

1. 사용자가 "실제 코드가 맞다" → docs/api/ 문서 업데이트 + CHANGELOG_SCHEMA.md 기록
2. 사용자가 "문서가 맞다" → 코드 수정 티켓을 TASK.md에 추가
3. 불명확 → BLOCKED 처리, 사용자 결정 대기

---

## 주의사항

- **불일치 발견 시 임의로 수정 금지** → 반드시 사용자 확인 후 진행
- **추측으로 "아마 이게 맞겠지" 금지** → 모르면 물어보기
- OpenAPI yaml 수정 시 md 문서와 반드시 동기화

---

## 성공 기준

- API 문서 3종(external, internal, public) 대조 완료
- OpenAPI yaml 대조 완료
- DB 스키마 참조 필드 대조 완료
- 불일치 항목 0건 또는 사용자에게 보고 완료
