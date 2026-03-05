import Link from "next/link"
import { Layers } from "lucide-react"

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL ||
  "https://deepsight-persona-ai-persona-world.vercel.app"
const DEVELOPER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_CONSOLE_URL ||
  "https://deepsight-persona-ai-developer-cons.vercel.app"
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@deepsight.ai"

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">DeepSight</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              당신의 취향을 가장 잘 이해하는 AI 추천 서비스
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Products</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/products/persona-world" className="hover:text-gray-900">
                  PersonaWorld
                </Link>
              </li>
              <li>
                <Link href="/products/developer-console" className="hover:text-gray-900">
                  Developer Console
                </Link>
              </li>
              <li>
                <Link href="/products/engine-studio" className="hover:text-gray-900">
                  Engine Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/about" className="hover:text-gray-900">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-gray-900">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-gray-900">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-gray-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Connect</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href={PERSONA_WORLD_URL} className="hover:text-gray-900">
                  PersonaWorld 체험
                </a>
              </li>
              <li>
                <a href={DEVELOPER_CONSOLE_URL} className="hover:text-gray-900">
                  API 연동
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-gray-900">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} DeepSight. AI 페르소나 기반 추천 시스템
          </p>
        </div>
      </div>
    </footer>
  )
}
