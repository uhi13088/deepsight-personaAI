# pr - PR 설명 자동 생성

TASK.md의 DONE 항목과 git diff를 기반으로 PR 설명을 작성합니다.

## 트리거

- 사용자가 "PR 만들어", "pr", "풀리퀘스트" 등을 요청할 때

## 실행 순서

### Step 1: 정보 수집

1. `TASK.md`의 최근 DONE 항목 확인
2. `git diff main` (또는 develop) 실행
3. 변경된 파일 목록 확인
4. 커밋 히스토리 확인

### Step 2: PR 작성

## PR 템플릿

```markdown
## What (무엇을)

- TASK.md 티켓 기반 설명

## Why (왜)

- 변경 이유/배경

## How (어떻게)

- 주요 변경 사항
- 기술적 결정 사항

## Changes (변경 파일)

- `src/...`
- `src/...`

## Test (테스트)

- [ ] 유닛 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트: (방법)

## Risk & Rollback (위험/롤백)

- 위험: (있으면)
- 롤백: (방법)

## Screenshots (있으면)
```

## 출력

- 위 템플릿을 채워서 출력
- 복사해서 바로 PR에 붙여넣을 수 있게

## 성공 기준

- DONE 항목의 모든 변경사항이 PR에 반영됨
- git diff와 PR 설명이 일치함
