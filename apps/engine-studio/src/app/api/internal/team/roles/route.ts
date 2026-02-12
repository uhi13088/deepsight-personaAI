import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { ROLE_DEFINITIONS, getPermissionsForRole } from "@/lib/team"
import type { RoleDefinition, Permission } from "@/lib/team"

interface RolesResponse {
  roles: RoleDefinition[]
  permissionsByRole: Record<string, Permission[]>
}

export async function GET() {
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
