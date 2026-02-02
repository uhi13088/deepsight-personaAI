module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 새로운 기능
        "fix", // 버그 수정
        "docs", // 문서 변경
        "style", // 코드 포맷팅
        "refactor", // 리팩토링
        "perf", // 성능 개선
        "test", // 테스트 추가/수정
        "chore", // 빌드, 설정 변경
        "ci", // CI 설정 변경
        "revert", // 커밋 되돌리기
      ],
    ],
    "subject-case": [0], // 한글 커밋 메시지 허용
  },
}
