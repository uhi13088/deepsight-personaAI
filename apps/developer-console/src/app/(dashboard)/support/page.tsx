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
  ArrowRight,
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

// FAQ Data
const faqCategories = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Zap,
    faqs: [
      {
        question: "API Key는 어떻게 생성하나요?",
        answer:
          "Dashboard에서 'API Keys' 메뉴로 이동한 후 '새 API Key 생성' 버튼을 클릭하세요. 키 이름, 환경(Test/Live), 권한을 설정한 후 생성할 수 있습니다.",
      },
      {
        question: "Test 환경과 Live 환경의 차이는 무엇인가요?",
        answer:
          "Test 환경은 개발 및 테스트용으로 과금되지 않습니다. Live 환경은 실제 프로덕션용이며 API 호출에 따라 과금됩니다. 먼저 Test 환경에서 충분히 테스트 후 Live로 전환하시기 바랍니다.",
      },
      {
        question: "첫 API 호출은 어떻게 하나요?",
        answer:
          "API Key를 생성한 후, Playground에서 바로 테스트하거나 문서의 Quick Start 가이드를 따라 진행하세요. cURL, JavaScript, Python 등 다양한 언어의 예제 코드를 제공합니다.",
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
          "Rate Limit 초과 시 HTTP 429 에러가 반환됩니다. 잠시 후 다시 시도하거나, 플랜을 업그레이드하여 Rate Limit을 높일 수 있습니다. Retry-After 헤더를 확인하여 대기 시간을 파악하세요.",
      },
      {
        question: "API 응답 시간이 느린 경우 어떻게 해야 하나요?",
        answer:
          "응답 시간 지연의 일반적인 원인: 1) 콘텐츠 길이가 너무 긴 경우 2) 동시 요청이 많은 경우 3) 네트워크 지연. 콘텐츠를 적절히 분할하거나 Batch API를 활용해 보세요.",
      },
      {
        question: "Webhook은 어떻게 설정하나요?",
        answer:
          "Webhook은 Pro 플랜 이상에서 사용 가능합니다. Settings > Webhooks에서 엔드포인트 URL을 등록하고 수신할 이벤트를 선택하세요. HMAC 서명으로 요청을 검증할 수 있습니다.",
      },
      {
        question: "6D Vector는 무엇인가요?",
        answer:
          "6D Vector는 DeepSight의 핵심 매칭 기술입니다. Depth(깊이), Lens(관점), Stance(태도), Scope(범위), Taste(취향), Purpose(목적) 6가지 차원으로 콘텐츠와 페르소나를 분석합니다.",
      },
    ],
  },
  {
    id: "billing",
    name: "Billing & Plans",
    icon: AlertCircle,
    faqs: [
      {
        question: "플랜 변경은 어떻게 하나요?",
        answer:
          "Billing 페이지에서 원하는 플랜을 선택하여 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며, 다운그레이드는 현재 결제 주기 종료 후 적용됩니다.",
      },
      {
        question: "API 호출 한도를 초과하면 어떻게 되나요?",
        answer:
          "한도 초과 시 추가 요청은 거부됩니다. 즉시 플랜을 업그레이드하거나 다음 결제 주기까지 기다려야 합니다. 사용량 알림을 설정하여 미리 대비하세요.",
      },
      {
        question: "환불 정책은 어떻게 되나요?",
        answer:
          "서비스 특성상 사용한 API 호출에 대해서는 환불이 불가합니다. 단, 서비스 장애로 인한 미사용의 경우 개별 검토 후 크레딧으로 보상해 드립니다.",
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
    responseTime: "24시간 이내",
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
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        placeholder="Brief description of your issue"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                      />
                    </div>
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
