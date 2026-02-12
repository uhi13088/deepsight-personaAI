import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createDeployWorkflow,
  advanceDeployStage,
  ENVIRONMENT_CONFIGS,
} from "@/lib/system-integration"
import type { DeployWorkflow, DeployEnvironment, DeployTarget } from "@/lib/system-integration"

interface DeployHistoryResponse {
  workflows: DeployWorkflow[]
  environments: typeof ENVIRONMENT_CONFIGS
}

// GET — 배포 히스토리 및 환경 구성 반환
export async function GET() {
  try {
    // 샘플 배포 히스토리 생성
    const sampleWorkflow = createDeployWorkflow(
      "algorithm",
      "v1.1.0",
      "development",
      "admin@deepsight.ai"
    )
    const passedBuild = advanceDeployStage(sampleWorkflow, "build", true, ["Build OK"])
    const passedTest = advanceDeployStage(passedBuild, "test", true, ["Tests passed"])

    return NextResponse.json<ApiResponse<DeployHistoryResponse>>({
      success: true,
      data: {
        workflows: [passedTest],
        environments: ENVIRONMENT_CONFIGS,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 히스토리 조회 실패" },
      },
      { status: 500 }
    )
  }
}

interface CreateWorkflowBody {
  target: DeployTarget
  targetVersion: string
  environment: DeployEnvironment
  createdBy: string
}

// POST — 새 배포 워크플로우 생성
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateWorkflowBody

    if (!body.target || !body.targetVersion || !body.environment || !body.createdBy) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "필수 필드가 누락되었습니다" },
        },
        { status: 400 }
      )
    }

    const workflow = createDeployWorkflow(
      body.target,
      body.targetVersion,
      body.environment,
      body.createdBy
    )

    return NextResponse.json<ApiResponse<DeployWorkflow>>({
      success: true,
      data: workflow,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 워크플로우 생성 실패" },
      },
      { status: 500 }
    )
  }
}
