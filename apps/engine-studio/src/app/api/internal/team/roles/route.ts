import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { ROLE_DEFINITIONS, getPermissionsForRole } from "@/lib/team"
import type { Role, RoleDefinition, Permission } from "@/lib/team"

interface PermissionResource {
  resource: string
  label: string
  actions: Array<{ action: string; permission: Permission; label: string }>
}

interface RolesResponse {
  roles: RoleDefinition[]
  permissionsByRole: Record<string, Permission[]>
  memberCounts: Record<Role, number>
  permissionMatrix: PermissionResource[]
}

// ── Permission matrix data ─────────────────────────────────────
const PERMISSION_MATRIX: PermissionResource[] = [
  {
    resource: "persona",
    label: "페르소나",
    actions: [
      { action: "create", permission: "persona:create", label: "생성" },
      { action: "read", permission: "persona:read", label: "조회" },
      { action: "update", permission: "persona:update", label: "수정" },
      { action: "delete", permission: "persona:delete", label: "삭제" },
      { action: "publish", permission: "persona:publish", label: "게시" },
    ],
  },
  {
    resource: "matching",
    label: "매칭 엔진",
    actions: [
      { action: "execute", permission: "matching:execute", label: "실행" },
      { action: "configure", permission: "matching:configure", label: "설정" },
      { action: "read_results", permission: "matching:read_results", label: "결과 조회" },
    ],
  },
  {
    resource: "content",
    label: "콘텐츠",
    actions: [
      { action: "create", permission: "content:create", label: "생성" },
      { action: "read", permission: "content:read", label: "조회" },
      { action: "update", permission: "content:update", label: "수정" },
      { action: "delete", permission: "content:delete", label: "삭제" },
      { action: "publish", permission: "content:publish", label: "게시" },
    ],
  },
  {
    resource: "analytics",
    label: "분석/리포트",
    actions: [
      { action: "view_dashboard", permission: "analytics:view_dashboard", label: "대시보드" },
      { action: "export_data", permission: "analytics:export_data", label: "데이터 내보내기" },
      { action: "create_report", permission: "analytics:create_report", label: "리포트 생성" },
    ],
  },
  {
    resource: "test",
    label: "테스트",
    actions: [
      { action: "execute", permission: "test:execute", label: "실행" },
      { action: "configure", permission: "test:configure", label: "설정" },
      { action: "read_results", permission: "test:read_results", label: "결과 조회" },
    ],
  },
  {
    resource: "team",
    label: "팀 관리",
    actions: [
      { action: "invite", permission: "team:invite", label: "초대" },
      { action: "manage_roles", permission: "team:manage_roles", label: "역할 관리" },
      { action: "deactivate", permission: "team:deactivate", label: "비활성화" },
      { action: "view_members", permission: "team:view_members", label: "멤버 조회" },
    ],
  },
  {
    resource: "settings",
    label: "설정",
    actions: [
      { action: "manage", permission: "settings:manage", label: "관리" },
      { action: "view", permission: "settings:view", label: "조회" },
    ],
  },
  {
    resource: "audit",
    label: "감사 로그",
    actions: [
      { action: "view", permission: "audit:view", label: "조회" },
      { action: "export", permission: "audit:export", label: "내보내기" },
    ],
  },
  {
    resource: "api",
    label: "API",
    actions: [
      { action: "manage_keys", permission: "api:manage_keys", label: "키 관리" },
      { action: "view_keys", permission: "api:view_keys", label: "키 조회" },
      {
        action: "configure_endpoints",
        permission: "api:configure_endpoints",
        label: "엔드포인트 설정",
      },
    ],
  },
  {
    resource: "model",
    label: "모델/LLM",
    actions: [
      { action: "configure", permission: "model:configure", label: "설정" },
      { action: "view_config", permission: "model:view_config", label: "설정 조회" },
      { action: "view_cost", permission: "model:view_cost", label: "비용 조회" },
    ],
  },
  {
    resource: "node_graph",
    label: "노드 그래프",
    actions: [
      { action: "create", permission: "node_graph:create", label: "생성" },
      { action: "read", permission: "node_graph:read", label: "조회" },
      { action: "update", permission: "node_graph:update", label: "수정" },
      { action: "delete", permission: "node_graph:delete", label: "삭제" },
      { action: "execute", permission: "node_graph:execute", label: "실행" },
    ],
  },
]

// ── Seed member counts for demo ──────────────────────────────────
const SEED_MEMBER_COUNTS: Record<Role, number> = {
  admin: 1,
  ai_engineer: 2,
  content_manager: 1,
  analyst: 1,
}

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const roles = [...ROLE_DEFINITIONS]
    const permissionsByRole: Record<string, Permission[]> = {}

    for (const rd of roles) {
      permissionsByRole[rd.role] = getPermissionsForRole(rd.role)
    }

    return NextResponse.json<ApiResponse<RolesResponse>>({
      success: true,
      data: {
        roles,
        permissionsByRole,
        memberCounts: SEED_MEMBER_COUNTS,
        permissionMatrix: PERMISSION_MATRIX,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "역할 정보 조회 실패" },
      },
      { status: 500 }
    )
  }
}
