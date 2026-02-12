import { describe, it, expect, vi, beforeEach } from "vitest"

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock("@/services/api-client", () => ({
  apiClient: mockApiClient,
  ApiError: class MockApiError extends Error {
    code: string
    status: number
    timestamp: string
    constructor(details: { code: string; message: string; status: number; timestamp: string }) {
      super(details.message)
      this.code = details.code
      this.status = details.status
      this.timestamp = details.timestamp
    }
  },
}))

import { teamService } from "@/services/team-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("teamService.getTeam", () => {
  it("fetches team data", async () => {
    const team = {
      members: [],
      pendingInvites: [],
      organization: { name: "TestOrg" },
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: team })

    const result = await teamService.getTeam()
    expect(mockApiClient.get).toHaveBeenCalledWith("/team")
    expect(result.organization.name).toBe("TestOrg")
  })

  it("returns fallback data on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await teamService.getTeam()
    expect(result.members).toEqual([])
    expect(result.pendingInvites).toEqual([])
    expect(result.organization).toBeDefined()
  })
})

describe("teamService.inviteMember", () => {
  it("invites a team member", async () => {
    const invite = { id: "inv_1", email: "new@example.com", role: "developer" }
    mockApiClient.post.mockResolvedValue({ success: true, data: { invite } })

    const result = await teamService.inviteMember({
      email: "new@example.com",
      role: "developer",
    })
    expect(mockApiClient.post).toHaveBeenCalledWith("/team/invite", {
      email: "new@example.com",
      role: "developer",
    })
    expect(result.email).toBe("new@example.com")
  })
})

describe("teamService.updateMember", () => {
  it("updates member role", async () => {
    const member = { id: "mem_1", role: "admin" }
    mockApiClient.patch.mockResolvedValue({ success: true, data: { member } })

    const result = await teamService.updateMember("mem_1", { role: "admin" })
    expect(mockApiClient.patch).toHaveBeenCalledWith("/team/members/mem_1", { role: "admin" })
    expect(result.role).toBe("admin")
  })
})

describe("teamService.removeMember", () => {
  it("removes a team member", async () => {
    mockApiClient.delete.mockResolvedValue({ success: true })
    await teamService.removeMember("mem_1")
    expect(mockApiClient.delete).toHaveBeenCalledWith("/team/members/mem_1")
  })
})

describe("teamService.cancelInvite", () => {
  it("cancels a pending invite", async () => {
    mockApiClient.delete.mockResolvedValue({ success: true })
    await teamService.cancelInvite("inv_1")
    expect(mockApiClient.delete).toHaveBeenCalledWith("/team/invites/inv_1")
  })
})

describe("teamService.resendInvite", () => {
  it("resends an invite", async () => {
    mockApiClient.post.mockResolvedValue({ success: true })
    await teamService.resendInvite("inv_1")
    expect(mockApiClient.post).toHaveBeenCalledWith("/team/invites/inv_1/resend")
  })
})
