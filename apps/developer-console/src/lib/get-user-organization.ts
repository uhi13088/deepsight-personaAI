/**
 * 인증된 사용자의 소속 조직을 안전하게 조회하는 헬퍼
 * OrganizationMember 조인 테이블 기반으로 조직을 조회하여 Cross-Org 접근을 방지한다.
 */

import prisma from "@/lib/prisma"

interface OrganizationInfo {
  id: string
  name: string
  slug: string
  plan: string
}

interface MembershipInfo {
  organization: OrganizationInfo
  role: string
  organizationId: string
}

/**
 * 사용자 ID로 소속 조직을 조회한다.
 * findFirst() WITHOUT WHERE 패턴 대신 반드시 이 함수를 사용할 것.
 */
export async function getUserOrganization(userId: string): Promise<MembershipInfo | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, plan: true },
      },
    },
  })

  if (!membership) return null

  return {
    organization: membership.organization,
    role: membership.role,
    organizationId: membership.organizationId,
  }
}
