TASK.md의 DONE 항목과 git diff를 기반으로 PR 설명을 작성해줘.

## 참조

1. `TASK.md`의 최근 DONE 항목
2. `git diff main` (또는 develop)
3. 변경된 파일 목록

## PR 템플릿

```markdown
## 🎯 What (무엇을)

- TASK.md 티켓 기반 설명

## 💡 Why (왜)

- 변경 이유/배경

## 🔧 How (어떻게)

- 주요 변경 사항
- 기술적 결정 사항

## 📋 Changes (변경 파일)

- `src/...`
- `src/...`

## ✅ Test (테스트)

- [ ] 유닛 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트: (방법)

## ⚠️ Risk & Rollback (위험/롤백)

- 위험: (있으면)
- 롤백: (방법)

## 📸 Screenshots (있으면)
```

## 출력

- 위 템플릿을 채워서 출력
- 복사해서 바로 PR에 붙여넣을 수 있게
