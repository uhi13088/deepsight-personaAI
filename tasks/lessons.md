# Lessons Learned

> 사용자로부터 수정 지시를 받을 때마다 여기에 기록한다.
> 세션 시작 시 반드시 이 파일을 읽고 같은 실수를 반복하지 않는다.

---

## 규칙

1. 사용자가 수정을 지시하면 → 즉시 이 파일에 패턴 추가
2. 기록 형식: `[날짜] 카테고리: 구체적 교훈`
3. 모호한 교훈 금지 → "조심하기" (X) / "fetch 대신 lib/http.ts의 httpClient 사용" (O)

---

## 교훈 목록

<!-- 예시:
- [2026-02-03] API: fetch 대신 프로젝트 내 lib/http.ts의 httpClient를 사용할 것
- [2026-02-03] 스타일: className 직접 작성 금지, cn() 유틸리티 사용
- [2026-02-03] 테스트: mocking 시 vi.mock보다 dependency injection 우선
-->

- [2026-02-09] 네이밍: Prisma 필드는 camelCase + `@map("snake_case")` 패턴 사용. snake_case 필드명 직접 사용 금지
- [2026-02-09] 네이밍: 6D 벡터 타입은 전 앱에서 `Decimal @db.Decimal(3, 2)` 통일. Float 사용 금지
- [2026-02-09] 네이밍: TypeScript 코드 전체 camelCase 통일 (API 응답 JSON 키 포함)
- [2026-02-09] 네이밍: Prisma Decimal → number 변환 시 반드시 `Number()` 래핑 (산술 연산 전)
- [2026-02-09] 프로세스: 작업 시작 전 사용자에게 계획 공유하고 승인 받을 것
