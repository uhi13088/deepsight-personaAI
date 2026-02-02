/**
 * Audit Logger - 금융업계 수준 감사 로깅
 * 모든 보안 관련 이벤트 기록 및 추적
 */

import { sha256 } from "./encryption"

// ============================================================================
// 타입 정의
// ============================================================================

/** 감사 이벤트 카테고리 */
export type AuditCategory =
  | "AUTH" // 인증 관련
  | "ACCESS" // 접근 제어
  | "DATA" // 데이터 변경
  | "SECURITY" // 보안 이벤트
  | "SYSTEM" // 시스템 이벤트
  | "API" // API 호출
  | "ADMIN" // 관리자 작업

/** 감사 이벤트 심각도 */
export type AuditSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL"

/** 감사 이벤트 액션 */
export type AuditAction =
  // 인증 관련
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "SESSION_EXPIRED"
  | "TOKEN_REFRESH"

  // 접근 제어
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "PERMISSION_CHANGE"
  | "ROLE_ASSIGNMENT"

  // 데이터 관련
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "IMPORT"

  // 보안 이벤트
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_TOKEN"
  | "SUSPICIOUS_ACTIVITY"
  | "BRUTE_FORCE_DETECTED"
  | "IP_BLOCKED"
  | "CSRF_VIOLATION"
  | "XSS_ATTEMPT"
  | "SQL_INJECTION_ATTEMPT"

  // 시스템 이벤트
  | "SYSTEM_START"
  | "SYSTEM_SHUTDOWN"
  | "CONFIG_CHANGE"
  | "DEPLOYMENT"
  | "BACKUP"
  | "RESTORE"

  // API 관련
  | "API_CALL"
  | "API_ERROR"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_SENT"

/** 감사 로그 엔트리 */
export interface AuditLogEntry {
  /** 고유 ID */
  id: string
  /** 타임스탬프 (ISO 8601) */
  timestamp: string
  /** 카테고리 */
  category: AuditCategory
  /** 액션 */
  action: AuditAction
  /** 심각도 */
  severity: AuditSeverity
  /** 사용자 ID */
  userId?: string
  /** 사용자 이메일 (마스킹됨) */
  userEmail?: string
  /** 세션 ID */
  sessionId?: string
  /** IP 주소 (익명화 가능) */
  ipAddress?: string
  /** User Agent */
  userAgent?: string
  /** 리소스 타입 */
  resourceType?: string
  /** 리소스 ID */
  resourceId?: string
  /** 요청 경로 */
  requestPath?: string
  /** HTTP 메서드 */
  httpMethod?: string
  /** 응답 상태 코드 */
  statusCode?: number
  /** 추가 세부 정보 */
  details?: Record<string, unknown>
  /** 결과 */
  result: "SUCCESS" | "FAILURE"
  /** 에러 메시지 (실패 시) */
  errorMessage?: string
  /** 요청 ID (추적용) */
  requestId?: string
  /** 해시 (무결성 검증) */
  hash: string
  /** 이전 로그 해시 (체인) */
  previousHash?: string
}

/** 감사 로그 컨텍스트 */
export interface AuditContext {
  userId?: string
  userEmail?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
  requestPath?: string
  httpMethod?: string
}

// ============================================================================
// 감사 로거 클래스
// ============================================================================

class AuditLogger {
  private logs: AuditLogEntry[] = []
  private lastHash: string = "GENESIS"
  private logHandlers: ((entry: AuditLogEntry) => void | Promise<void>)[] = []

  /**
   * 로그 핸들러 등록
   */
  addHandler(handler: (entry: AuditLogEntry) => void | Promise<void>): void {
    this.logHandlers.push(handler)
  }

  /**
   * 감사 로그 생성
   */
  async log(
    category: AuditCategory,
    action: AuditAction,
    context: AuditContext,
    options: {
      severity?: AuditSeverity
      resourceType?: string
      resourceId?: string
      details?: Record<string, unknown>
      result?: "SUCCESS" | "FAILURE"
      errorMessage?: string
      statusCode?: number
    } = {}
  ): Promise<AuditLogEntry> {
    const timestamp = new Date().toISOString()
    const id = this.generateLogId()

    // 로그 엔트리 생성
    const entry: AuditLogEntry = {
      id,
      timestamp,
      category,
      action,
      severity: options.severity ?? this.determineSeverity(action, options.result),
      userId: context.userId,
      userEmail: context.userEmail ? this.maskEmail(context.userEmail) : undefined,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress ? this.anonymizeIp(context.ipAddress) : undefined,
      userAgent: context.userAgent ? this.truncateUserAgent(context.userAgent) : undefined,
      requestId: context.requestId,
      requestPath: context.requestPath,
      httpMethod: context.httpMethod,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: this.sanitizeDetails(options.details),
      result: options.result ?? "SUCCESS",
      errorMessage: options.errorMessage,
      statusCode: options.statusCode,
      hash: "",
      previousHash: this.lastHash,
    }

    // 무결성 해시 계산
    entry.hash = this.calculateHash(entry)
    this.lastHash = entry.hash

    // 로그 저장
    this.logs.push(entry)

    // 핸들러 실행
    await this.notifyHandlers(entry)

    // 콘솔 출력 (개발 환경)
    if (process.env.NODE_ENV === "development") {
      this.consoleLog(entry)
    }

    return entry
  }

  /**
   * 인증 성공 로그
   */
  async logAuthSuccess(context: AuditContext): Promise<AuditLogEntry> {
    return this.log("AUTH", "LOGIN_SUCCESS", context, {
      severity: "INFO",
    })
  }

  /**
   * 인증 실패 로그
   */
  async logAuthFailure(context: AuditContext, reason: string): Promise<AuditLogEntry> {
    return this.log("AUTH", "LOGIN_FAILURE", context, {
      severity: "WARN",
      result: "FAILURE",
      errorMessage: reason,
    })
  }

  /**
   * 접근 거부 로그
   */
  async logAccessDenied(
    context: AuditContext,
    resource: string,
    reason: string
  ): Promise<AuditLogEntry> {
    return this.log("ACCESS", "ACCESS_DENIED", context, {
      severity: "WARN",
      resourceType: resource,
      result: "FAILURE",
      errorMessage: reason,
    })
  }

  /**
   * Rate Limit 초과 로그
   */
  async logRateLimitExceeded(context: AuditContext): Promise<AuditLogEntry> {
    return this.log("SECURITY", "RATE_LIMIT_EXCEEDED", context, {
      severity: "WARN",
      result: "FAILURE",
      errorMessage: "Rate limit exceeded",
    })
  }

  /**
   * 의심스러운 활동 로그
   */
  async logSuspiciousActivity(
    context: AuditContext,
    details: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log("SECURITY", "SUSPICIOUS_ACTIVITY", context, {
      severity: "ERROR",
      details,
      result: "FAILURE",
    })
  }

  /**
   * 데이터 변경 로그
   */
  async logDataChange(
    context: AuditContext,
    action: "CREATE" | "UPDATE" | "DELETE",
    resourceType: string,
    resourceId: string,
    changes?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log("DATA", action, context, {
      severity: "INFO",
      resourceType,
      resourceId,
      details: changes,
    })
  }

  /**
   * API 호출 로그
   */
  async logApiCall(
    context: AuditContext,
    statusCode: number,
    responseTime?: number
  ): Promise<AuditLogEntry> {
    return this.log("API", "API_CALL", context, {
      severity: statusCode >= 400 ? "WARN" : "INFO",
      statusCode,
      result: statusCode < 400 ? "SUCCESS" : "FAILURE",
      details: responseTime ? { responseTimeMs: responseTime } : undefined,
    })
  }

  // ============================================================================
  // 유틸리티 메서드
  // ============================================================================

  /**
   * 로그 ID 생성
   */
  private generateLogId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `audit_${timestamp}_${random}`
  }

  /**
   * 심각도 자동 결정
   */
  private determineSeverity(action: AuditAction, result?: "SUCCESS" | "FAILURE"): AuditSeverity {
    // 보안 관련 이벤트
    const criticalActions: AuditAction[] = [
      "BRUTE_FORCE_DETECTED",
      "SQL_INJECTION_ATTEMPT",
      "XSS_ATTEMPT",
      "IP_BLOCKED",
    ]

    const errorActions: AuditAction[] = ["SUSPICIOUS_ACTIVITY", "INVALID_TOKEN", "CSRF_VIOLATION"]

    const warnActions: AuditAction[] = ["LOGIN_FAILURE", "ACCESS_DENIED", "RATE_LIMIT_EXCEEDED"]

    if (criticalActions.includes(action)) return "CRITICAL"
    if (errorActions.includes(action)) return "ERROR"
    if (warnActions.includes(action)) return "WARN"
    if (result === "FAILURE") return "WARN"

    return "INFO"
  }

  /**
   * 이메일 마스킹
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split("@")
    if (!local || !domain) return "***@***"

    const maskedLocal =
      local.length <= 2
        ? "*".repeat(local.length)
        : local[0] + "*".repeat(local.length - 2) + local[local.length - 1]

    return `${maskedLocal}@${domain}`
  }

  /**
   * IP 주소 익명화 (마지막 옥텟 제거)
   */
  private anonymizeIp(ip: string): string {
    if (ip.includes(":")) {
      // IPv6
      const parts = ip.split(":")
      return parts.slice(0, -2).join(":") + ":****:****"
    }
    // IPv4
    const parts = ip.split(".")
    return parts.slice(0, -1).join(".") + ".***"
  }

  /**
   * User Agent 축약
   */
  private truncateUserAgent(ua: string): string {
    if (ua.length <= 100) return ua
    return ua.substring(0, 100) + "..."
  }

  /**
   * 세부 정보 정제 (민감 데이터 제거)
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credential",
      "apiKey",
      "accessToken",
      "refreshToken",
    ]

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))

      if (isSensitive) {
        sanitized[key] = "[REDACTED]"
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * 무결성 해시 계산
   */
  private calculateHash(entry: Omit<AuditLogEntry, "hash">): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      category: entry.category,
      action: entry.action,
      userId: entry.userId,
      result: entry.result,
      previousHash: entry.previousHash,
    })

    return sha256(data)
  }

  /**
   * 로그 체인 무결성 검증
   */
  verifyChain(logs: AuditLogEntry[]): { valid: boolean; brokenAt?: number } {
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]

      // 해시 검증
      const expectedHash = this.calculateHash({
        ...log,
        hash: undefined,
      } as Omit<AuditLogEntry, "hash">)

      if (log.hash !== expectedHash) {
        return { valid: false, brokenAt: i }
      }

      // 체인 검증
      if (i > 0 && log.previousHash !== logs[i - 1].hash) {
        return { valid: false, brokenAt: i }
      }
    }

    return { valid: true }
  }

  /**
   * 핸들러 알림
   */
  private async notifyHandlers(entry: AuditLogEntry): Promise<void> {
    for (const handler of this.logHandlers) {
      try {
        await handler(entry)
      } catch (error) {
        console.error("[AuditLogger] Handler error:", error)
      }
    }
  }

  /**
   * 콘솔 출력
   */
  private consoleLog(entry: AuditLogEntry): void {
    const severityColors = {
      DEBUG: "\x1b[90m", // Gray
      INFO: "\x1b[36m", // Cyan
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      CRITICAL: "\x1b[41m\x1b[37m", // Red bg, White text
    }

    const reset = "\x1b[0m"
    const color = severityColors[entry.severity]

    console.log(
      `${color}[AUDIT][${entry.severity}]${reset} ` +
        `${entry.category}:${entry.action} ` +
        `[${entry.result}] ` +
        `user=${entry.userId || "anonymous"} ` +
        `ip=${entry.ipAddress || "unknown"} ` +
        (entry.resourceType ? `resource=${entry.resourceType}:${entry.resourceId} ` : "") +
        (entry.errorMessage ? `error="${entry.errorMessage}"` : "")
    )
  }

  /**
   * 로그 조회
   */
  getLogs(filters?: {
    category?: AuditCategory
    action?: AuditAction
    severity?: AuditSeverity
    userId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }): AuditLogEntry[] {
    let result = [...this.logs]

    if (filters?.category) {
      result = result.filter((l) => l.category === filters.category)
    }

    if (filters?.action) {
      result = result.filter((l) => l.action === filters.action)
    }

    if (filters?.severity) {
      result = result.filter((l) => l.severity === filters.severity)
    }

    if (filters?.userId) {
      result = result.filter((l) => l.userId === filters.userId)
    }

    if (filters?.startDate) {
      result = result.filter((l) => new Date(l.timestamp) >= filters.startDate!)
    }

    if (filters?.endDate) {
      result = result.filter((l) => new Date(l.timestamp) <= filters.endDate!)
    }

    // 최신순 정렬
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (filters?.limit) {
      result = result.slice(0, filters.limit)
    }

    return result
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const auditLogger = new AuditLogger()
export default auditLogger
