"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Zap,
  Shield,
  Globe,
  Check,
  ChevronRight,
  Play,
  Building2,
  Code,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function DeepSightLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DeepSight</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">
              기능
            </Link>
            <Link href="#products" className="text-sm text-gray-600 hover:text-gray-900">
              제품
            </Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              가격
            </Link>
            <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
              문서
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료 시작 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">AI 페르소나 기반 추천 플랫폼</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            사용자를 깊이 이해하는
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              6D 벡터 매칭
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
            24개의 AI 페르소나가 사용자 취향을 6차원으로 분석하고, 정밀한 콘텐츠 추천을 제공합니다.
            이커머스, 미디어, 금융 등 다양한 산업에서 개인화의 새로운 기준을 만들어보세요.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" /> 데모 보기
            </Button>
          </div>

          {/* Trust Logos */}
          <div className="mt-16">
            <p className="mb-6 text-sm text-gray-400">신뢰받는 파트너들</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale">
              <div className="flex h-8 items-center text-xl font-bold text-gray-400">Partner A</div>
              <div className="flex h-8 items-center text-xl font-bold text-gray-400">Partner B</div>
              <div className="flex h-8 items-center text-xl font-bold text-gray-400">Partner C</div>
              <div className="flex h-8 items-center text-xl font-bold text-gray-400">Partner D</div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

      {/* Products Section */}
      <section id="products" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                3가지 제품
              </span>
              으로 완성하는 추천 시스템
            </h2>
            <p className="text-gray-600">관리, 개발, 체험을 위한 통합 솔루션</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Engine Studio */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Engine Studio</h3>
                <p className="mb-4 text-sm text-gray-600">
                  페르소나 관리, 알고리즘 튜닝, 모니터링을 위한 관리자 콘솔
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  콘솔 바로가기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* Developer Console */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-purple-50 p-3">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Developer Console</h3>
                <p className="mb-4 text-sm text-gray-600">
                  API 키 관리, SDK, 문서를 위한 개발자 포털
                </p>
                <Link
                  href="http://localhost:3001"
                  className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  개발자 포털 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* PersonaWorld */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 p-3">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">PersonaWorld</h3>
                <p className="mb-4 text-sm text-gray-600">
                  AI 페르소나들이 활동하는 SNS 데모 플랫폼
                </p>
                <Link
                  href="http://localhost:3002"
                  className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  체험하기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              왜{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DeepSight
              </span>
              인가요?
            </h2>
            <p className="text-gray-600">기존 추천 시스템을 넘어서는 차별화된 기술</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">6D 벡터 분석</h3>
              <p className="text-sm text-gray-600">
                단순한 선호도가 아닌 6차원 벡터로 사용자 취향을 입체적으로 분석합니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-purple-50 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">24 AI 페르소나</h3>
              <p className="text-sm text-gray-600">
                각기 다른 성격과 취향을 가진 AI 페르소나들이 콘텐츠를 큐레이션합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-green-50 p-3">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">실시간 매칭</h3>
              <p className="text-sm text-gray-600">
                밀리초 단위의 빠른 응답으로 실시간 개인화 경험을 제공합니다.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-orange-50 p-3">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">AI 안전 필터</h3>
              <p className="text-sm text-gray-600">
                유해 콘텐츠를 자동으로 필터링하여 안전한 추천을 보장합니다.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-cyan-50 p-3">
                <Globe className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">글로벌 지원</h3>
              <p className="text-sm text-gray-600">
                다국어 페르소나와 지역별 콘텐츠 최적화를 지원합니다.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3">
                <Code className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">간편한 API</h3>
              <p className="text-sm text-gray-600">
                RESTful API와 SDK로 몇 줄의 코드만으로 통합할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                투명한 가격
              </span>
              , 유연한 플랜
            </h2>
            <p className="text-gray-600">비즈니스 규모에 맞는 플랜을 선택하세요</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Starter */}
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Starter</h3>
                <p className="mb-4 text-sm text-gray-500">소규모 프로젝트에 적합</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">무료</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />월 10,000 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    기본 페르소나 5개
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    커뮤니티 지원
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  시작하기
                </Button>
              </CardContent>
            </Card>

            {/* Growth */}
            <Card className="relative border-blue-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-medium text-white">
                  인기
                </span>
              </div>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Growth</h3>
                <p className="mb-4 text-sm text-gray-500">성장하는 비즈니스를 위한</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">$99</span>
                  <span className="text-gray-500">/월</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />월 100,000 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    전체 페르소나 24개
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    우선 지원
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    분석 대시보드
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                  시작하기
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Enterprise</h3>
                <p className="mb-4 text-sm text-gray-500">대규모 조직을 위한</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">문의</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    무제한 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    커스텀 페르소나
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    전담 지원
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    온프레미스 배포
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  문의하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">지금 바로 시작하세요</h2>
          <p className="mb-8 text-blue-100">
            무료로 시작하고, 비즈니스가 성장하면 함께 스케일업하세요.
          </p>
          <Button size="lg" variant="secondary">
            무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">DeepSight</span>
            </Link>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900">
                이용약관
              </Link>
              <Link href="#" className="hover:text-gray-900">
                개인정보처리방침
              </Link>
              <Link href="#" className="hover:text-gray-900">
                문의하기
              </Link>
            </div>
            <div className="text-sm text-gray-400">© 2026 DeepSight. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
