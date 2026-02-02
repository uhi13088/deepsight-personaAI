/**
 * DeepSight Engine Studio - Korean Translations
 * 모든 한국어 UI 문자열을 중앙에서 관리합니다.
 */

export const ko = {
  // ==========================================================================
  // 공통 UI 요소
  // ==========================================================================
  common: {
    // 버튼
    buttons: {
      save: "저장",
      cancel: "취소",
      confirm: "확인",
      delete: "삭제",
      edit: "편집",
      create: "생성",
      add: "추가",
      remove: "제거",
      close: "닫기",
      back: "뒤로",
      next: "다음",
      previous: "이전",
      submit: "제출",
      search: "검색",
      filter: "필터",
      reset: "초기화",
      refresh: "새로고침",
      export: "내보내기",
      import: "가져오기",
      download: "다운로드",
      upload: "업로드",
      copy: "복사",
      duplicate: "복제",
      archive: "보관",
      restore: "복원",
      apply: "적용",
      test: "테스트",
      deploy: "배포",
      activate: "활성화",
      deactivate: "비활성화",
      approve: "승인",
      reject: "거부",
      retry: "재시도",
      viewDetails: "상세 보기",
      viewAll: "전체 보기",
      loadMore: "더 보기",
      showMore: "더 보기",
      showLess: "접기",
      selectAll: "전체 선택",
      deselectAll: "선택 해제",
    },

    // 상태
    status: {
      active: "활성",
      inactive: "비활성",
      pending: "대기 중",
      processing: "처리 중",
      completed: "완료",
      failed: "실패",
      error: "오류",
      success: "성공",
      warning: "경고",
      info: "정보",
      draft: "임시저장",
      review: "검토 중",
      approved: "승인됨",
      rejected: "거부됨",
      paused: "일시정지",
      archived: "보관됨",
      deprecated: "사용중지",
      standard: "보통",
      legacy: "레거시",
    },

    // 시간
    time: {
      now: "방금 전",
      minutesAgo: "분 전",
      hoursAgo: "시간 전",
      daysAgo: "일 전",
      weeksAgo: "주 전",
      monthsAgo: "개월 전",
      yearsAgo: "년 전",
      today: "오늘",
      yesterday: "어제",
      thisWeek: "이번 주",
      lastWeek: "지난 주",
      thisMonth: "이번 달",
      lastMonth: "지난 달",
    },

    // 단위
    units: {
      count: "개",
      people: "명",
      times: "회",
      percent: "%",
      seconds: "초",
      minutes: "분",
      hours: "시간",
      days: "일",
      weeks: "주",
      months: "개월",
      years: "년",
      bytes: "B",
      kilobytes: "KB",
      megabytes: "MB",
      gigabytes: "GB",
    },

    // 메시지
    messages: {
      loading: "로딩 중...",
      saving: "저장 중...",
      deleting: "삭제 중...",
      processing: "처리 중...",
      noData: "데이터가 없습니다",
      noResults: "검색 결과가 없습니다",
      error: "오류가 발생했습니다",
      success: "성공적으로 처리되었습니다",
      confirmDelete: "정말 삭제하시겠습니까?",
      unsavedChanges: "저장하지 않은 변경사항이 있습니다",
      required: "필수 항목입니다",
      invalidFormat: "형식이 올바르지 않습니다",
      copied: "클립보드에 복사되었습니다",
    },

    // 라벨
    labels: {
      name: "이름",
      email: "이메일",
      password: "비밀번호",
      description: "설명",
      status: "상태",
      type: "유형",
      category: "카테고리",
      date: "날짜",
      time: "시간",
      createdAt: "생성일",
      updatedAt: "수정일",
      author: "작성자",
      assignee: "담당자",
      priority: "우선순위",
      tags: "태그",
      notes: "메모",
      actions: "작업",
      options: "옵션",
      settings: "설정",
      total: "합계",
      average: "평균",
      count: "수량",
    },
  },

  // ==========================================================================
  // 네비게이션
  // ==========================================================================
  nav: {
    dashboard: "대시보드",
    personas: "페르소나",
    personaStudio: "페르소나 스튜디오",
    personaList: "페르소나 목록",
    personaCreate: "새 페르소나",
    personaIncubator: "인큐베이터",
    userInsight: "유저 인사이트",
    userOverview: "사용자 개요",
    userClusters: "클러스터 분석",
    userJourneys: "여정 분석",
    userTrends: "트렌드 분석",
    matchingLab: "매칭 랩",
    matchingSimulator: "시뮬레이터",
    matchingPerformance: "성능 분석",
    matchingABTest: "A/B 테스트",
    systemIntegration: "시스템 통합",
    apiDocs: "API 문서",
    webhooks: "웹훅",
    deployment: "배포",
    operations: "운영 관리",
    monitoring: "모니터링",
    incidents: "인시던트",
    backups: "백업",
    globalConfig: "전역 설정",
    modelConfig: "모델 설정",
    securityConfig: "보안 설정",
    featureFlags: "기능 플래그",
    teamAccess: "팀 관리",
    members: "멤버",
    roles: "역할",
    activity: "활동 로그",
  },

  // ==========================================================================
  // 페르소나 스튜디오
  // ==========================================================================
  persona: {
    title: "페르소나 스튜디오",
    subtitle: "AI 페르소나를 생성하고 관리합니다",

    // 목록 페이지
    list: {
      title: "페르소나 목록",
      createNew: "새 페르소나 만들기",
      totalCount: "총 {count}개의 페르소나",
      searchPlaceholder: "페르소나 검색...",
      filterByStatus: "상태별 필터",
      filterByRole: "역할별 필터",
      sortBy: "정렬 기준",
      noPersonas: "등록된 페르소나가 없습니다",
    },

    // 상세 페이지
    detail: {
      basicInfo: "기본 정보",
      vectorConfig: "벡터 설정",
      promptTemplate: "프롬프트 템플릿",
      performance: "성능 지표",
      history: "변경 이력",
      test: "테스트",
    },

    // 필드
    fields: {
      name: "페르소나 이름",
      role: "역할",
      expertise: "전문 분야",
      status: "상태",
      vector: "6D 벡터",
      promptTemplate: "프롬프트 템플릿",
      matchCount: "매칭 횟수",
      accuracy: "정확도",
      createdAt: "생성일",
      updatedAt: "최종 수정일",
    },

    // 역할
    roles: {
      reviewer: "리뷰어",
      curator: "큐레이터",
      educator: "교육자",
      companion: "동반자",
      analyst: "분석가",
    },

    // 상태
    statuses: {
      draft: "임시저장",
      review: "검토 중",
      active: "활성",
      standard: "보통",
      legacy: "레거시",
      deprecated: "사용중지",
      paused: "일시정지",
      archived: "보관",
    },

    // 벡터 차원
    vectors: {
      depth: {
        name: "분석 깊이",
        lowLabel: "직관적",
        highLabel: "심층적",
        description: "콘텐츠를 어느 깊이까지 분석하고 설명하는지 결정합니다.",
      },
      lens: {
        name: "판단 렌즈",
        lowLabel: "감성적",
        highLabel: "논리적",
        description: "감성과 논리 중 어떤 관점으로 콘텐츠를 평가하는지 결정합니다.",
      },
      stance: {
        name: "평가 태도",
        lowLabel: "수용적",
        highLabel: "비판적",
        description: "콘텐츠에 대해 수용적인지 비판적인지 결정합니다.",
      },
      scope: {
        name: "관심 범위",
        lowLabel: "핵심만",
        highLabel: "디테일",
        description: "핵심 요약만 할지 세부 사항까지 다룰지 결정합니다.",
      },
      taste: {
        name: "취향 성향",
        lowLabel: "클래식",
        highLabel: "실험적",
        description: "검증된 클래식 작품과 실험적인 작품 중 선호도를 결정합니다.",
      },
      purpose: {
        name: "소비 목적",
        lowLabel: "오락",
        highLabel: "의미추구",
        description: "오락과 재미 위주인지 의미와 메시지를 추구하는지 결정합니다.",
      },
    },

    // 인큐베이터
    incubator: {
      title: "페르소나 인큐베이터",
      subtitle: "새로운 페르소나를 학습시키고 테스트합니다",
      inProgress: "학습 중",
      ready: "배포 준비",
      failed: "테스트 실패",
      testScore: "테스트 점수",
      progress: "진행률",
    },

    // 액션
    actions: {
      create: "페르소나 생성",
      edit: "페르소나 편집",
      delete: "페르소나 삭제",
      duplicate: "페르소나 복제",
      test: "테스트 실행",
      export: "내보내기",
      activate: "활성화",
      deactivate: "비활성화",
      archive: "보관",
      restore: "복원",
      approve: "승인",
      reject: "거부",
    },

    // 메시지
    messages: {
      createSuccess: "페르소나가 생성되었습니다",
      updateSuccess: "페르소나가 수정되었습니다",
      deleteSuccess: "페르소나가 삭제되었습니다",
      deleteConfirm: "이 페르소나를 삭제하시겠습니까?",
      activateSuccess: "페르소나가 활성화되었습니다",
      deactivateSuccess: "페르소나가 비활성화되었습니다",
      testStarted: "테스트가 시작되었습니다",
      testCompleted: "테스트가 완료되었습니다",
      approveSuccess: "페르소나가 승인되었습니다",
      rejectSuccess: "페르소나가 거부되었습니다",
    },
  },

  // ==========================================================================
  // 유저 인사이트
  // ==========================================================================
  userInsight: {
    title: "유저 인사이트",
    subtitle: "사용자 행동과 선호도를 분석합니다",

    overview: {
      title: "사용자 개요",
      totalUsers: "총 사용자",
      activeUsers: "활성 사용자",
      newUsers: "신규 사용자",
      retention: "재방문율",
    },

    clusters: {
      title: "클러스터 분석",
      subtitle: "유사한 사용자 그룹을 분석합니다",
      clusterCount: "클러스터 수",
      avgClusterSize: "평균 클러스터 크기",
    },

    journeys: {
      title: "여정 분석",
      subtitle: "사용자 행동 경로를 추적합니다",
    },

    trends: {
      title: "트렌드 분석",
      subtitle: "시간에 따른 변화를 분석합니다",
    },
  },

  // ==========================================================================
  // 매칭 랩
  // ==========================================================================
  matchingLab: {
    title: "매칭 랩",
    subtitle: "페르소나 매칭 알고리즘을 테스트하고 최적화합니다",

    simulator: {
      title: "시뮬레이터",
      subtitle: "매칭 결과를 시뮬레이션합니다",
      runSimulation: "시뮬레이션 실행",
      simulationResults: "시뮬레이션 결과",
    },

    performance: {
      title: "성능 분석",
      subtitle: "매칭 성능 지표를 모니터링합니다",
      accuracy: "정확도",
      latency: "응답 시간",
      throughput: "처리량",
    },

    abTest: {
      title: "A/B 테스트",
      subtitle: "알고리즘 변형을 비교 테스트합니다",
      createTest: "테스트 생성",
      runningTests: "진행 중인 테스트",
      completedTests: "완료된 테스트",
    },
  },

  // ==========================================================================
  // 시스템 통합
  // ==========================================================================
  systemIntegration: {
    title: "시스템 통합",
    subtitle: "외부 시스템과의 연동을 관리합니다",

    api: {
      title: "API 관리",
      subtitle: "API 엔드포인트를 관리합니다",
      endpoint: "엔드포인트",
      method: "메서드",
      rateLimit: "Rate Limit",
      lastCalled: "마지막 호출",
    },

    webhooks: {
      title: "웹훅",
      subtitle: "이벤트 기반 알림을 설정합니다",
      url: "URL",
      events: "이벤트",
      successRate: "성공률",
    },

    deployment: {
      title: "배포",
      subtitle: "시스템 배포를 관리합니다",
      environment: "환경",
      version: "버전",
      lastDeployed: "마지막 배포",
    },
  },

  // ==========================================================================
  // 운영 관리
  // ==========================================================================
  operations: {
    title: "운영 관리",
    subtitle: "시스템 운영 현황을 모니터링합니다",

    monitoring: {
      title: "모니터링",
      subtitle: "시스템 상태를 실시간으로 확인합니다",
      systemHealth: "시스템 상태",
      cpuUsage: "CPU 사용률",
      memoryUsage: "메모리 사용률",
      diskUsage: "디스크 사용률",
      networkTraffic: "네트워크 트래픽",
    },

    incidents: {
      title: "인시던트",
      subtitle: "시스템 이슈를 관리합니다",
      open: "미해결",
      inProgress: "처리 중",
      resolved: "해결됨",
      severity: {
        low: "낮음",
        medium: "보통",
        high: "높음",
        critical: "심각",
      },
    },

    backups: {
      title: "백업",
      subtitle: "데이터 백업을 관리합니다",
      type: {
        full: "전체 백업",
        incremental: "증분 백업",
        differential: "차등 백업",
      },
      lastBackup: "마지막 백업",
      nextBackup: "다음 백업",
    },
  },

  // ==========================================================================
  // 전역 설정
  // ==========================================================================
  globalConfig: {
    title: "전역 설정",
    subtitle: "시스템 전역 설정을 관리합니다",

    model: {
      title: "모델 설정",
      subtitle: "AI 모델 관련 설정을 관리합니다",
      provider: "모델 제공자",
      version: "모델 버전",
      temperature: "Temperature",
      maxTokens: "Max Tokens",
    },

    security: {
      title: "보안 설정",
      subtitle: "보안 관련 설정을 관리합니다",
      mfa: "다중 인증",
      sessionTimeout: "세션 타임아웃",
      passwordPolicy: "비밀번호 정책",
      ipWhitelist: "IP 화이트리스트",
    },

    features: {
      title: "기능 플래그",
      subtitle: "기능 활성화 상태를 관리합니다",
      enabled: "활성화됨",
      disabled: "비활성화됨",
    },
  },

  // ==========================================================================
  // 팀 관리
  // ==========================================================================
  team: {
    title: "팀 관리",
    subtitle: "팀 멤버와 권한을 관리합니다",

    members: {
      title: "멤버 관리",
      subtitle: "팀 멤버를 관리합니다",
      invite: "멤버 초대",
      remove: "멤버 제거",
      changeRole: "역할 변경",
    },

    roles: {
      title: "역할 관리",
      subtitle: "역할과 권한을 관리합니다",
      admin: "관리자",
      aiEngineer: "AI 엔지니어",
      contentManager: "콘텐츠 매니저",
      analyst: "분석가",
    },

    activity: {
      title: "활동 로그",
      subtitle: "팀 활동 내역을 확인합니다",
      action: "작업",
      user: "사용자",
      timestamp: "시간",
      details: "상세",
    },
  },

  // ==========================================================================
  // 인증
  // ==========================================================================
  auth: {
    login: {
      title: "로그인",
      subtitle: "계정에 로그인하세요",
      email: "이메일",
      password: "비밀번호",
      rememberMe: "로그인 상태 유지",
      forgotPassword: "비밀번호 찾기",
      loginButton: "로그인",
      orContinueWith: "또는",
      googleLogin: "Google로 계속",
      githubLogin: "GitHub으로 계속",
    },

    logout: {
      title: "로그아웃",
      confirmMessage: "정말 로그아웃하시겠습니까?",
    },

    errors: {
      invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다",
      accountLocked: "계정이 잠겼습니다. 잠시 후 다시 시도하세요",
      sessionExpired: "세션이 만료되었습니다. 다시 로그인하세요",
      unauthorized: "접근 권한이 없습니다",
    },
  },

  // ==========================================================================
  // 에러 페이지
  // ==========================================================================
  errors: {
    notFound: {
      title: "페이지를 찾을 수 없습니다",
      message: "요청하신 페이지가 존재하지 않습니다",
      backHome: "홈으로 돌아가기",
    },
    serverError: {
      title: "서버 오류",
      message: "서버에 문제가 발생했습니다. 잠시 후 다시 시도하세요",
    },
    forbidden: {
      title: "접근 권한 없음",
      message: "이 페이지에 접근할 권한이 없습니다",
    },
  },
} as const

// 타입 추출
export type TranslationKeys = typeof ko
