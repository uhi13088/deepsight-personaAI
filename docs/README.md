# DeepSight 문서 인덱스

> AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼

---

## design/ — v4 설계서 + 구현계획서 (Active)

| 문서                                                          | 설명                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| [persona-engine-v4.md](design/persona-engine-v4.md)           | 엔진 v4 설계서 — 보안 3계층, 기억 지능, 아레나, 캐릭터 바이블 |
| [persona-engine-v4-impl.md](design/persona-engine-v4-impl.md) | 엔진 v4 구현계획서 — 타입/모델/함수 명세, Phase 0~5           |
| [persona-world-v4.md](design/persona-world-v4.md)             | PersonaWorld v4 설계서 — 자율 SNS + 보안/기억/감정전염 통합   |
| [persona-world-v4-impl.md](design/persona-world-v4-impl.md)   | PersonaWorld v4 구현계획서 — PW-Phase 0~5, 30 태스크          |

---

## specs/ — 기능정의서 (Reference)

| 문서                                               | 설명                                            |
| -------------------------------------------------- | ----------------------------------------------- |
| [engine-studio.md](specs/engine-studio.md)         | 엔진스튜디오 — 페르소나 관리, 벡터 매칭, 설문   |
| [developer-console.md](specs/developer-console.md) | 개발자콘솔 — API 관리, 대시보드, 빌링           |
| [persona-world.md](specs/persona-world.md)         | 페르소나월드 — AI SNS, 자율 활동, 피드 알고리즘 |
| [persona-world-ui.md](specs/persona-world-ui.md)   | PW UI 디자인시스템 — 컴포넌트, 컬러, 모션       |

---

## guides/ — 개발 가이드

| 문서                                    | 설명                                            |
| --------------------------------------- | ----------------------------------------------- |
| [development.md](guides/development.md) | 개발 가이드 — 기술 스택, 네이밍, API 설계, 배포 |

---

## schemas/ — 데이터 스키마

| 문서                                               | 설명                                   |
| -------------------------------------------------- | -------------------------------------- |
| [fingerprint-v1.json](schemas/fingerprint-v1.json) | 컬러지문 스키마 v1 — CIELAB(D50)+OKLCH |

---

## archive/ — 비활성 문서

| 문서                                                                   | 설명                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [persona-system-v2-design.md](archive/persona-system-v2-design.md)     | v2 페르소나 설계서 (v3로 대체됨)                 |
| [persona-engine-v3.md](archive/persona-engine-v3.md)                   | 엔진 v3 설계서 (v4로 대체됨)                     |
| [persona-engine-v3-impl.md](archive/persona-engine-v3-impl.md)         | 엔진 v3 구현계획서 (v4로 대체됨)                 |
| [persona-world-v3.md](archive/persona-world-v3.md)                     | PersonaWorld v3 설계서 (v4로 대체됨)             |
| [persona-world-v3-impl.md](archive/persona-world-v3-impl.md)           | PersonaWorld v3 구현계획서 (v4로 대체됨)         |
| [marketing-pricing-guide.md](archive/marketing-pricing-guide.md)       | 마케팅/가격 전략 가이드                          |
| [landing-page-image-request.md](archive/landing-page-image-request.md) | 랜딩페이지 이미지 요청서                         |
| [claude-code-legacy.md](archive/claude-code-legacy.md)                 | Claude Code 가이드 (Python/FastAPI 기준, 구버전) |

---

## 빠른 참조

### PersonaWorld 개발 시

1. v4 설계 → `design/persona-world-v4.md`
2. 구현 명세 → `design/persona-world-v4-impl.md`
3. 기능 요구사항 → `specs/persona-world.md`
4. UI 컴포넌트 → `specs/persona-world-ui.md`

### 페르소나 엔진 개발 시

1. v4 설계 → `design/persona-engine-v4.md`
2. 구현 명세 → `design/persona-engine-v4-impl.md`
3. 기능 요구사항 → `specs/engine-studio.md`

### API/대시보드 개발 시

1. 기능 설계 → `specs/developer-console.md`
