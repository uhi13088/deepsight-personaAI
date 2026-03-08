-- T370: 카카오톡 페르소나 연동 테이블
-- 유저 1명 = 페르소나 1개 카카오톡 연동

CREATE TABLE IF NOT EXISTS "kakao_links" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "personaId"     TEXT NOT NULL,
  "kakaoUserKey"  TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "kakao_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kakao_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "kakao_links_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 유저 1명당 1개 연동만 허용
CREATE UNIQUE INDEX IF NOT EXISTS "kakao_links_userId_key" ON "kakao_links"("userId");

-- 카카오 유저 식별자 유니크 + 인덱스 (웹훅에서 빠른 조회)
CREATE UNIQUE INDEX IF NOT EXISTS "kakao_links_kakaoUserKey_key" ON "kakao_links"("kakaoUserKey");
CREATE INDEX IF NOT EXISTS "kakao_links_kakaoUserKey_idx" ON "kakao_links"("kakaoUserKey");
