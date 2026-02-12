"use client"

import * as React from "react"
import Link from "next/link"
import {
  HelpCircle,
  MessageCircle,
  Book,
  ExternalLink,
  Search,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  FileText,
  Video,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// FAQ Data (v3)
const faqCategories = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Zap,
    faqs: [
      {
        question: "API Key는 어떻게 생성하나요?",
        answer:
          "Dashboard에서 'API Keys' 메뉴로 이동한 후 '새 API Key 생성' 버튼을 클릭하세요. 키 이름, 환경(Test/Live)을 설정한 후 생성할 수 있습니다. Test 키는 과금 없이 테스트할 수 있습니다.",
      },
      {
        question: "첫 API 호출은 어떻게 하나요?",
        answer:
          "API Key 생성 후 Playground에서 바로 테스트하거나 Quick Start를 따라 진행하세요. 기본 흐름: 1) Onboarding API로 유저 성향 벡터 생성 → 2) Match API로 3-Tier 매칭 실행 → 3) Feedback API로 결과 피드백 제출.",
      },
      {
        question: "DeepSight v3 API로 무엇을 할 수 있나요?",
        answer:
          "3-Layer 106D+ 벡터 시스템 기반으로 유저-페르소나 매칭을 제공합니다. 주요 기능: 페르소나 카탈로그(검색/필터), 유저 온보딩(성향 벡터 생성), 3-Tier 매칭(basic/advanced/exploration), 피드백 루프, 배치 매칭, 동의 관리.",
      },
      {
        question: "3-Layer 벡터 시스템이란 무엇인가요?",
        answer:
          "L1 Social Persona(7D: depth/lens/stance/scope/taste/purpose/sociability), L2 Core Temperament/OCEAN(5D), L3 Narrative Drive(4D: lack/moralCompass/volatility/growthArc)로 구성된 다차원 성향 분석 시스템입니다. 각 레이어의 교차 분석으로 Extended Paradox Score(EPS)를 산출합니다.",
      },
    ],
  },
  {
    id: "api",
    name: "API & Technical",
    icon: FileText,
    faqs: [
      {
        question: "Rate Limit에 걸리면 어떻게 되나요?",
        answer:
          "Rate Limit 초과 시 HTTP 429 에러가 반환됩니다. X-RateLimit-Remaining 헤더로 남은 호출 수를, X-RateLimit-Reset 헤더로 리셋 시간을 확인하세요. 플랜 업그레이드로 Rate Limit을 높일 수 있습니다 (Starter 200/분 ~ Ent.Scale 무제한).",
      },
      {
        question: "3-Tier 매칭은 어떻게 다른가요?",
        answer:
          "Basic: L1(7D)만 사용하여 빠른 매칭. Advanced: L1 70% + L2 20% + EPS 10%로 성격 특성 반영. Exploration: L1 50% + L2 20% + L3 20% + EPS 10%로 서사적 성향까지 탐색. 플랜에 따라 사용 가능한 티어가 다릅니다.",
      },
      {
        question: "유저 온보딩 레벨은 어떻게 선택하나요?",
        answer:
          "QUICK(12문항): 빠른 시작, 정밀도 ~45%. STANDARD(30문항): 일반 권장, 정밀도 ~62%. DEEP(60문항): 최고 정밀도 ~75%. SNS 연동 시 L2 벡터가 자동 생성되어 정밀도가 더 높아집니다.",
      },
      {
        question: "동의(Consent) 관리는 어떻게 하나요?",
        answer:
          "4가지 동의 항목이 있습니다: data_collection(필수), sns_analysis, third_party_sharing, marketing. data_collection은 서비스 이용에 필수이며, third_party_sharing 미동의 시 프로필 조회 API가 403 CONSENT_REQUIRED를 반환합니다.",
      },
      {
        question: "Webhook은 어떻게 설정하나요?",
        answer:
          "Webhooks 메뉴에서 HTTPS 엔드포인트 URL을 등록하고 수신할 이벤트(persona.activated, match.completed, user.onboarded, consent.updated 등)를 선택하세요. X-DeepSight-Signature 헤더로 요청 무결성을 검증할 수 있습니다.",
      },
    ],
  },
  {
    id: "billing",
    name: "Billing & Plans",
    icon: AlertCircle,
    faqs: [
      {
        question: "어떤 플랜이 있나요?",
        answer:
          "6개 플랜: Starter($199/월), Pro($499/월), Max($1,499/월), Enterprise Starter($3,500/월), Enterprise Growth($5,000/월), Enterprise Scale($15,000/월). 연간 결제 시 일반 플랜 20% 할인. Enterprise는 별도 문의.",
      },
      {
        question: "플랜 변경은 어떻게 하나요?",
        answer:
          "Billing 페이지에서 원하는 플랜을 선택하여 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며, 다운그레이드는 현재 결제 주기 종료 후 적용됩니다.",
      },
      {
        question: "API 호출 한도를 초과하면 어떻게 되나요?",
        answer:
          "매칭 API 초과분에 대해 건당 초과 요금이 부과됩니다 (플랜별 상이). PW 페르소나 초과 시에도 개당 초과 요금이 적용됩니다. Usage 페이지에서 실시간 사용량을 확인하고 알림을 설정하세요.",
      },
    ],
  },
]

const supportChannels = [
  {
    name: "Email Support",
    description: "이메일로 문의하세요",
    icon: Mail,
    contact: "support@deepsight.ai",
    responseTime: "플랜별 상이",
    available: true,
  },
  {
    name: "Community Forum",
    description: "커뮤니티에서 질문하세요",
    icon: Users,
    contact: "community.deepsight.ai",
    responseTime: "커뮤니티 응답",
    available: true,
  },
  {
    name: "Live Chat",
    description: "실시간 채팅 지원",
    icon: MessageCircle,
    contact: "Pro 플랜 이상",
    responseTime: "즉시 응답",
    available: false,
  },
  {
    name: "Phone Support",
    description: "전화 상담",
    icon: Phone,
    contact: "Enterprise 전용",
    responseTime: "즉시 응답",
    available: false,
  },
]

// 6-Tier Support Response Times
const supportTiers = [
  { plan: "Starter", price: "$199", email: "48h", chat: "-", phone: "-", sla: "-" },
  { plan: "Pro", price: "$499", email: "24h", chat: "영업시간", phone: "-", sla: "99.5%" },
  { plan: "Max", price: "$1,499", email: "12h", chat: "24/7", phone: "-", sla: "99.9%" },
  {
    plan: "Ent. Starter",
    price: "$3,500",
    email: "4h",
    chat: "24/7",
    phone: "영업시간",
    sla: "99.9%",
  },
  { plan: "Ent. Growth", price: "$5,000", email: "2h", chat: "24/7", phone: "24/7", sla: "99.95%" },
  {
    plan: "Ent. Scale",
    price: "$15,000",
    email: "1h",
    chat: "24/7",
    phone: "24/7 전담",
    sla: "99.99%",
  },
]

// Community Links
const communityLinks = [
  { name: "Discord", description: "실시간 커뮤니티 채팅", href: "https://discord.gg/deepsight" },
  { name: "Forum", description: "기술 토론 및 Q&A", href: "https://community.deepsight.ai" },
  {
    name: "Newsletter",
    description: "업데이트 소식 구독",
    href: "https://deepsight.ai/newsletter",
  },
  { name: "Status Page", description: "서비스 상태 확인", href: "https://status.deepsight.ai" },
]

const resources = [
  {
    title: "API Documentation",
    description: "전체 API 레퍼런스 문서",
    icon: Book,
    href: "/docs#api",
  },
  {
    title: "Quick Start Guide",
    description: "5분 만에 시작하기",
    icon: Zap,
    href: "/docs#quickstart",
  },
  {
    title: "Video Tutorials",
    description: "단계별 비디오 가이드",
    icon: Video,
    href: "/playground",
  },
  {
    title: "SDK & Examples",
    description: "SDK 및 예제 코드",
    icon: FileText,
    href: "/docs#quickstart",
  },
]

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [ticketSubject, setTicketSubject] = React.useState("")
  const [ticketMessage, setTicketMessage] = React.useState("")
  const [ticketCategory, setTicketCategory] = React.useState("")
  const [ticketPriority, setTicketPriority] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmitTicket = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setSubmitted(true)
    setTicketSubject("")
    setTicketMessage("")
    setTicketCategory("")
    setTicketPriority("")
  }

  const filteredFaqs = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground">
          도움이 필요하신가요? FAQ를 검색하거나 지원팀에 문의하세요.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-xl">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-10 text-lg"
          />
        </div>
      </div>

      {/* Quick Resources */}
      <div className="grid gap-4 md:grid-cols-4">
        {resources.map((resource) => {
          const Icon = resource.icon
          return (
            <Card key={resource.title} className="hover:border-primary/50 transition-colors">
              <Link href={resource.href}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Icon className="text-primary h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{resource.title}</h3>
                      <p className="text-muted-foreground text-sm">{resource.description}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground h-5 w-5" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          {(searchQuery ? filteredFaqs : faqCategories).map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary h-5 w-5" />
                    <CardTitle>{category.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`}>
                        <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          })}

          {searchQuery && filteredFaqs.length === 0 && (
            <div className="text-muted-foreground py-12 text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>No results found for &quot;{searchQuery}&quot;</p>
              <p className="mt-2 text-sm">Try different keywords or contact support</p>
            </div>
          )}
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          {/* Support Channels */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {supportChannels.map((channel) => {
              const Icon = channel.icon
              return (
                <Card key={channel.name} className={cn(!channel.available && "opacity-60")}>
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-center">
                      <div
                        className={cn(
                          "mx-auto w-fit rounded-full p-3",
                          channel.available ? "bg-primary/10" : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6",
                            channel.available ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{channel.name}</h3>
                        <p className="text-muted-foreground text-sm">{channel.description}</p>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{channel.contact}</p>
                        <p className="text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {channel.responseTime}
                        </p>
                      </div>
                      {!channel.available && <Badge variant="secondary">Upgrade Required</Badge>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit a Request</CardTitle>
              <CardDescription>
                문의사항을 남겨주시면 24시간 이내에 답변드리겠습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-200">
                    Request Submitted
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    문의가 접수되었습니다. 24시간 이내에 이메일로 답변드리겠습니다.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={ticketCategory} onValueChange={setTicketCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing Question</SelectItem>
                          <SelectItem value="account">Account Issue</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={ticketPriority} onValueChange={setTicketPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Brief description of your issue"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Please describe your issue in detail..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitTicket}
                    disabled={!ticketSubject || !ticketMessage || !ticketCategory || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 animate-spin">⏳</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* 6-Tier Support Response Time Table */}
          <Card>
            <CardHeader>
              <CardTitle>Plan-based Support</CardTitle>
              <CardDescription>플랜별 지원 채널 및 응답 시간</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium">Plan</th>
                      <th className="px-4 py-3 text-left font-medium">Price</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Chat</th>
                      <th className="px-4 py-3 text-left font-medium">Phone</th>
                      <th className="px-4 py-3 text-left font-medium">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTiers.map((tier) => (
                      <tr key={tier.plan} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{tier.plan}</td>
                        <td className="text-muted-foreground px-4 py-3">{tier.price}</td>
                        <td className="px-4 py-3">{tier.email}</td>
                        <td className="px-4 py-3">
                          {tier.chat === "-" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            tier.chat
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tier.phone === "-" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            tier.phone
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tier.sla === "-" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <Badge variant="outline">{tier.sla}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Community Links */}
          <Card>
            <CardHeader>
              <CardTitle>Community</CardTitle>
              <CardDescription>커뮤니티 채널에서 도움을 받으세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {communityLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:border-primary/50 flex items-center gap-3 rounded-lg border p-4 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{link.name}</p>
                      <p className="text-muted-foreground text-sm">{link.description}</p>
                    </div>
                    <ExternalLink className="text-muted-foreground ml-auto h-4 w-4" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>현재 서비스 상태</CardDescription>
                </div>
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  All Systems Operational
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "API", status: "operational", uptime: "99.99%" },
                { name: "Dashboard", status: "operational", uptime: "99.95%" },
                { name: "Playground", status: "operational", uptime: "99.90%" },
                { name: "Webhooks", status: "operational", uptime: "99.85%" },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                    <span>Uptime: {service.uptime}</span>
                    <Badge variant="success">Operational</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>최근 30일 이내 인시던트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500 opacity-50" />
                <p>No incidents reported in the last 30 days</p>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" asChild>
            <Link href="https://status.deepsight.ai" target="_blank">
              View Full Status Page
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
