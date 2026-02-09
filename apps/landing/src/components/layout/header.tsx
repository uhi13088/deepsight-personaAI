"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Layers,
  ChevronDown,
  Menu,
  X,
  Users,
  Code,
  Eye,
  Search,
  Sparkles,
  Fingerprint,
} from "lucide-react"

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
] as const

const FEATURE_ITEMS = [
  {
    label: "소비자 취향 분석",
    href: "/features/taste-analysis",
    desc: "6D 벡터 기반 정밀 프로파일링",
    icon: Search,
  },
  {
    label: "AI 페르소나",
    href: "/features/persona",
    desc: "P-inger Print와 고유한 관점",
    icon: Fingerprint,
  },
  {
    label: "매칭 시스템",
    href: "/features/matching",
    desc: "설명 가능한 투명한 추천",
    icon: Sparkles,
  },
] as const

const PRODUCT_ITEMS = [
  {
    label: "PersonaWorld",
    href: "/products/persona-world",
    desc: "AI 페르소나와 만나는 소셜 플랫폼",
    icon: Users,
  },
  {
    label: "Developer Console",
    href: "/products/developer-console",
    desc: "API & SDK로 추천 시스템 연동",
    icon: Code,
  },
  {
    label: "Persona Engine Studio",
    href: "/products/engine-studio",
    desc: "페르소나가 만들어지는 곳",
    icon: Eye,
  },
] as const

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">DeepSight</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              isActive("/") && pathname === "/"
                ? "font-medium text-[#667eea]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Home
          </Link>

          {/* Features Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors ${
                isActive("/features")
                  ? "font-medium text-[#667eea]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Features
              <ChevronDown
                className={`h-4 w-4 transition-transform ${featuresOpen ? "rotate-180" : ""}`}
              />
            </button>

            {featuresOpen && (
              <div className="absolute left-0 top-full w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                <Link
                  href="/features"
                  className="mb-1 block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-purple-500 hover:bg-gray-50"
                  onClick={() => setFeaturesOpen(false)}
                >
                  모든 기능 보기
                </Link>
                {FEATURE_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                    onClick={() => setFeaturesOpen(false)}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                      <item.icon className="h-5 w-5 text-[#667eea]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                isActive(item.href)
                  ? "font-medium text-[#667eea]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Products Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors ${
                isActive("/products")
                  ? "font-medium text-[#667eea]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Products
              <ChevronDown
                className={`h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {productsOpen && (
              <div className="absolute left-0 top-full w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                {PRODUCT_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                    onClick={() => setProductsOpen(false)}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                      <item.icon className="h-5 w-5 text-[#667eea]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/contact"
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              isActive("/contact")
                ? "font-medium text-[#667eea]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* CTA + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link
            href={PERSONA_WORLD_URL}
            className="ds-button hidden rounded-lg px-5 py-2 text-sm font-medium text-white md:inline-block"
          >
            시작하기
          </Link>
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-4">
            <Link
              href="/"
              className={`rounded-lg px-4 py-2 text-sm ${
                pathname === "/" ? "font-medium text-[#667eea]" : "text-gray-600"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Features
            </div>
            {FEATURE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm ${
                  isActive(item.href) ? "font-medium text-[#667eea]" : "text-gray-600"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm ${
                  isActive(item.href) ? "font-medium text-[#667eea]" : "text-gray-600"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Products
            </div>
            {PRODUCT_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm ${
                  isActive(item.href) ? "font-medium text-[#667eea]" : "text-gray-600"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className={`rounded-lg px-4 py-2 text-sm ${
                isActive("/contact") ? "font-medium text-[#667eea]" : "text-gray-600"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </Link>
            <Link
              href={PERSONA_WORLD_URL}
              className="ds-button mt-2 rounded-lg px-4 py-2 text-center text-sm font-medium text-white"
              onClick={() => setMobileOpen(false)}
            >
              시작하기
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
