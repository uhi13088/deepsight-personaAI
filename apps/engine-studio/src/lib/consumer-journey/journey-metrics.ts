// ═══════════════════════════════════════════════════════════════
// API Integration Guide — B2B 고객용 API 연동 가이드
// AC4: API Integration Guide
// ═══════════════════════════════════════════════════════════════

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"
export type AuthType = "api_key" | "oauth2" | "jwt"

/** API 엔드포인트 정의 */
export interface APIEndpoint {
  method: HttpMethod
  path: string
  description: string
  authentication: AuthType
  requestBody?: Record<string, FieldSpec>
  responseBody: Record<string, FieldSpec>
  rateLimit: string
  exampleRequest?: string
  exampleResponse?: string
}

/** 필드 스펙 */
export interface FieldSpec {
  type: string
  required: boolean
  description: string
  example?: string
}

/** SDK 코드 예제 */
export interface SDKExample {
  language: "typescript" | "python" | "curl"
  label: string
  description: string
  code: string
}

/** API 연동 가이드 전체 구조 */
export interface APIIntegrationGuide {
  version: string
  title: string
  description: string
  baseUrl: string
  authentication: {
    type: AuthType
    headerName: string
    description: string
    howToObtain: string
  }
  endpoints: APIEndpoint[]
  sdkExamples: SDKExample[]
  webhooks: WebhookDefinition[]
  errorCodes: ErrorCodeDefinition[]
  rateLimits: RateLimitInfo
  changelog: ChangelogEntry[]
}

export interface WebhookDefinition {
  event: string
  description: string
  payloadFields: Record<string, FieldSpec>
}

export interface ErrorCodeDefinition {
  code: string
  httpStatus: number
  message: string
  resolution: string
}

export interface RateLimitInfo {
  defaultLimit: string
  burstLimit: string
  perEndpoint: Record<string, string>
}

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

// ── Guide Generator ──────────────────────────────────────────

/** B2B 고객용 API 연동 가이드 생성 */
export function generateIntegrationGuide(options?: {
  baseUrl?: string
  version?: string
}): APIIntegrationGuide {
  const baseUrl = options?.baseUrl ?? "https://api.deepsight.ai"
  const version = options?.version ?? "v1"

  return {
    version,
    title: "DeepSight Persona Matching API Integration Guide",
    description:
      "페르소나 기반 콘텐츠 추천 API 연동 가이드. 3-Layer 벡터 매칭(L1: 7D Social Persona + L2: 5D OCEAN + L3: 4D Narrative Drive)을 활용한 개인화 추천을 제공합니다.",
    baseUrl,
    authentication: {
      type: "api_key",
      headerName: "X-DeepSight-API-Key",
      description: "Developer Console에서 발급받은 API Key를 헤더에 포함합니다.",
      howToObtain: "Developer Console > API Keys > Create New Key",
    },
    endpoints: buildEndpoints(baseUrl, version),
    sdkExamples: buildSDKExamples(baseUrl, version),
    webhooks: buildWebhookDefinitions(),
    errorCodes: buildErrorCodes(),
    rateLimits: {
      defaultLimit: "1,000 requests/minute",
      burstLimit: "100 requests/second",
      perEndpoint: {
        [`POST /${version}/match`]: "500 requests/minute",
        [`GET /${version}/personas`]: "1,000 requests/minute",
        [`POST /${version}/recommend`]: "500 requests/minute",
        [`POST /${version}/feedback`]: "2,000 requests/minute",
      },
    },
    changelog: [
      {
        version: "v1.0.0",
        date: "2026-02-01",
        changes: [
          "Initial release: 3-Tier matching (Basic/Advanced/Exploration)",
          "User profile creation with 3-Layer vector",
          "Persona recommendation endpoint",
        ],
      },
    ],
  }
}

function buildEndpoints(baseUrl: string, version: string): APIEndpoint[] {
  return [
    // Step 1: 유저 → 페르소나 매칭
    {
      method: "POST",
      path: `/${version}/match`,
      description:
        "유저 프로필을 기반으로 최적의 페르소나를 매칭합니다. 3-Tier 알고리즘(Basic/Advanced/Exploration)을 사용합니다.",
      authentication: "api_key",
      requestBody: {
        userProfile: {
          type: "object",
          required: true,
          description: "유저 프로필 (preferences, history, traits 또는 직접 벡터 입력)",
          example:
            '{"preferences": ["romance", "thriller"], "history": ["기생충"], "traits": ["논리적"]}',
        },
        limit: {
          type: "number",
          required: false,
          description: "반환할 매칭 결과 수 (default: 3, max: 10)",
          example: "3",
        },
        tier: {
          type: "string",
          required: false,
          description: "매칭 Tier 지정 (basic/advanced/exploration/all, default: all)",
          example: "all",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "매칭 결과 배열 (personaId, score, tier, explanation)",
          example:
            '{"matches": [{"personaId": "p_001", "score": 0.94, "tier": "basic", "explanation": "..."}]}',
        },
      },
      rateLimit: "500 requests/minute",
      exampleRequest: JSON.stringify(
        {
          userProfile: {
            preferences: ["romance", "thriller"],
            history: ["기생충", "더글로리"],
            traits: ["논리적", "디테일중시"],
          },
          limit: 3,
        },
        null,
        2
      ),
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            matches: [
              {
                personaId: "persona_cinephile",
                score: 0.94,
                tier: "basic",
                explanation: "표면적 성향 매칭 — 분석 깊이 일치도: 0.92, 판단 렌즈 일치도: 0.88",
              },
              {
                personaId: "persona_sf_mania",
                score: 0.87,
                tier: "advanced",
                explanation: "심층 매칭 — 역설 호환성: 0.85, 벡터 유사도: 0.89",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // Step 2: 페르소나 리뷰 조회
    {
      method: "GET",
      path: `/${version}/personas/{personaId}/reviews`,
      description: "특정 페르소나의 콘텐츠 리뷰를 조회합니다. contentId로 필터링 가능합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "리뷰 배열 (reviewId, contentId, text, rating, style)",
        },
      },
      rateLimit: "1,000 requests/minute",
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            reviews: [
              {
                reviewId: "rev_001",
                contentId: "movie_parasite",
                text: "봉준호 감독의 계급론을 ...",
                rating: 4.8,
                style: "analytical_deep",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // Step 3: 페르소나 기반 추천
    {
      method: "POST",
      path: `/${version}/recommend`,
      description: "매칭된 페르소나를 기반으로 콘텐츠를 추천합니다.",
      authentication: "api_key",
      requestBody: {
        personaId: {
          type: "string",
          required: true,
          description: "매칭된 페르소나 ID",
          example: "persona_cinephile",
        },
        userId: {
          type: "string",
          required: true,
          description: "최종 소비자 ID",
          example: "user_12345",
        },
        limit: {
          type: "number",
          required: false,
          description: "추천 콘텐츠 수 (default: 10, max: 50)",
          example: "10",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "추천 콘텐츠 배열 (contentId, score, reason)",
        },
      },
      rateLimit: "500 requests/minute",
      exampleRequest: JSON.stringify(
        {
          personaId: "persona_cinephile",
          userId: "user_12345",
          limit: 10,
        },
        null,
        2
      ),
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            recommendations: [
              {
                contentId: "movie_blade_runner",
                title: "블레이드 러너 2049",
                predictedRating: 4.9,
                reason: "시네필 평론가의 감성과 분석이 완벽하게 일치하는 SF 걸작",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // 페르소나 목록
    {
      method: "GET",
      path: `/${version}/personas`,
      description: "사용 가능한 페르소나 목록을 조회합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "페르소나 목록 (id, name, archetype, description)",
        },
      },
      rateLimit: "1,000 requests/minute",
    },

    // 유저 벡터 조회
    {
      method: "GET",
      path: `/${version}/user/{userId}/vector`,
      description:
        "유저의 현재 프로파일 벡터를 조회합니다. 점진적 프로파일링으로 학습된 벡터를 반환합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "유저 벡터 (l1, l2, l3, vFinal, confidence)",
        },
      },
      rateLimit: "1,000 requests/minute",
    },

    // 피드백 전송
    {
      method: "POST",
      path: `/${version}/feedback`,
      description: "유저의 페르소나/콘텐츠 피드백을 전송합니다. 점진적 프로파일링에 활용됩니다.",
      authentication: "api_key",
      requestBody: {
        userId: {
          type: "string",
          required: true,
          description: "최종 소비자 ID",
        },
        personaId: {
          type: "string",
          required: true,
          description: "페르소나 ID",
        },
        contentId: {
          type: "string",
          required: false,
          description: "콘텐츠 ID (있을 경우)",
        },
        action: {
          type: "string",
          required: true,
          description: "피드백 액션 (like/dislike/click/bookmark/share/dismiss)",
          example: "like",
        },
        metadata: {
          type: "object",
          required: false,
          description: "추가 메타데이터 (dwellTime, scrollDepth 등)",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
      },
      rateLimit: "2,000 requests/minute",
    },
  ]
}

function buildSDKExamples(baseUrl: string, version: string): SDKExample[] {
  return [
    {
      language: "typescript",
      label: "TypeScript/Node.js",
      description: "TypeScript SDK를 사용한 기본 매칭 흐름",
      code: `import { DeepSightClient } from '@deepsight/sdk';

const client = new DeepSightClient({
  apiKey: process.env.DEEPSIGHT_API_KEY!,
  baseUrl: '${baseUrl}',
});

// Step 1: 유저 → 페르소나 매칭
const matchResult = await client.match({
  userProfile: {
    preferences: ['romance', 'thriller'],
    history: ['기생충', '더글로리'],
    traits: ['논리적', '디테일중시'],
  },
  limit: 3,
});

// Step 2: 페르소나 리뷰 조회
const topPersonaId = matchResult.matches[0].personaId;
const reviews = await client.getReviews(topPersonaId, {
  contentId: 'movie_parasite',
});

// Step 3: 페르소나 기반 추천
const recommendations = await client.recommend({
  personaId: topPersonaId,
  userId: 'user_12345',
  limit: 10,
});

// Step 4: 피드백 전송
await client.sendFeedback({
  userId: 'user_12345',
  personaId: topPersonaId,
  contentId: recommendations[0].contentId,
  action: 'like',
});`,
    },
    {
      language: "python",
      label: "Python",
      description: "Python SDK를 사용한 기본 매칭 흐름",
      code: `from deepsight import DeepSightClient

client = DeepSightClient(
    api_key=os.environ["DEEPSIGHT_API_KEY"],
    base_url="${baseUrl}",
)

# Step 1: 유저 -> 페르소나 매칭
match_result = client.match(
    user_profile={
        "preferences": ["romance", "thriller"],
        "history": ["기생충", "더글로리"],
        "traits": ["논리적", "디테일중시"],
    },
    limit=3,
)

# Step 2: 페르소나 리뷰 조회
top_persona_id = match_result.matches[0].persona_id
reviews = client.get_reviews(top_persona_id, content_id="movie_parasite")

# Step 3: 페르소나 기반 추천
recommendations = client.recommend(
    persona_id=top_persona_id,
    user_id="user_12345",
    limit=10,
)

# Step 4: 피드백 전송
client.send_feedback(
    user_id="user_12345",
    persona_id=top_persona_id,
    content_id=recommendations[0].content_id,
    action="like",
)`,
    },
    {
      language: "curl",
      label: "cURL",
      description: "cURL을 사용한 API 호출 예시",
      code: `# Step 1: 유저 -> 페르소나 매칭
curl -X POST ${baseUrl}/${version}/match \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "userProfile": {
      "preferences": ["romance", "thriller"],
      "history": ["기생충", "더글로리"],
      "traits": ["논리적", "디테일중시"]
    },
    "limit": 3
  }'

# Step 2: 페르소나 리뷰 조회
curl ${baseUrl}/${version}/personas/persona_cinephile/reviews?content_id=movie_parasite \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY"

# Step 3: 페르소나 기반 추천
curl -X POST ${baseUrl}/${version}/recommend \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "personaId": "persona_cinephile",
    "userId": "user_12345",
    "limit": 10
  }'

# Step 4: 피드백 전송
curl -X POST ${baseUrl}/${version}/feedback \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "userId": "user_12345",
    "personaId": "persona_cinephile",
    "contentId": "movie_blade_runner",
    "action": "like"
  }'`,
    },
  ]
}

function buildWebhookDefinitions(): WebhookDefinition[] {
  return [
    {
      event: "match.completed",
      description: "매칭이 완료되었을 때 발생합니다.",
      payloadFields: {
        userId: { type: "string", required: true, description: "유저 ID" },
        matches: { type: "array", required: true, description: "매칭 결과 배열" },
        timestamp: { type: "string", required: true, description: "ISO 8601 타임스탬프" },
      },
    },
    {
      event: "user.vector_updated",
      description: "유저 벡터가 업데이트되었을 때 발생합니다 (점진적 프로파일링).",
      payloadFields: {
        userId: { type: "string", required: true, description: "유저 ID" },
        previousVector: { type: "object", required: true, description: "이전 벡터" },
        currentVector: { type: "object", required: true, description: "현재 벡터" },
        confidence: { type: "number", required: true, description: "벡터 신뢰도 (0~1)" },
      },
    },
    {
      event: "persona.activated",
      description: "새로운 페르소나가 활성화되었을 때 발생합니다.",
      payloadFields: {
        personaId: { type: "string", required: true, description: "페르소나 ID" },
        name: { type: "string", required: true, description: "페르소나 이름" },
        archetype: { type: "string", required: false, description: "아키타입" },
      },
    },
  ]
}

function buildErrorCodes(): ErrorCodeDefinition[] {
  return [
    {
      code: "AUTH_INVALID_KEY",
      httpStatus: 401,
      message: "Invalid or expired API key",
      resolution: "Developer Console에서 API Key를 재발급하세요.",
    },
    {
      code: "AUTH_RATE_LIMITED",
      httpStatus: 429,
      message: "Rate limit exceeded",
      resolution: "요청 빈도를 줄이거나 플랜을 업그레이드하세요.",
    },
    {
      code: "MATCH_NO_ACTIVE_PERSONAS",
      httpStatus: 404,
      message: "No active personas available for matching",
      resolution: "Engine Studio에서 페르소나를 활성화하세요.",
    },
    {
      code: "MATCH_INVALID_PROFILE",
      httpStatus: 400,
      message: "Invalid user profile format",
      resolution: "요청 바디의 userProfile 필드를 확인하세요.",
    },
    {
      code: "RECOMMEND_PERSONA_NOT_FOUND",
      httpStatus: 404,
      message: "Persona not found or inactive",
      resolution: "유효한 personaId를 사용하세요.",
    },
    {
      code: "FEEDBACK_INVALID_ACTION",
      httpStatus: 400,
      message: "Invalid feedback action",
      resolution: "action은 like/dislike/click/bookmark/share/dismiss 중 하나여야 합니다.",
    },
    {
      code: "INTERNAL_ERROR",
      httpStatus: 500,
      message: "Internal server error",
      resolution: "지속 발생 시 관리자에게 문의하세요.",
    },
  ]
}
