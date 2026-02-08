import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Calendar, Eye, Tag } from "lucide-react"
import { getBlogPost, getBlogPosts } from "@/lib/api"
import { notFound } from "next/navigation"

const CATEGORY_LABELS: Record<string, string> = {
  TECH: "기술",
  PRODUCT: "제품",
  INSIGHT: "인사이트",
  ANNOUNCEMENT: "공지",
}

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "bg-purple-100 text-purple-700",
  PRODUCT: "bg-green-100 text-green-700",
  INSIGHT: "bg-purple-100 text-purple-700",
  ANNOUNCEMENT: "bg-orange-100 text-orange-700",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await getBlogPost(slug)
    return {
      title: post.title,
      description: post.excerpt || undefined,
    }
  } catch {
    return { title: "Blog Post" }
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let post
  try {
    post = await getBlogPost(slug)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <article className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          {/* Back */}
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            블로그 목록
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-gray-700"}`}
              >
                {CATEGORY_LABELS[post.category] || post.category}
              </span>
              {post.publishedAt && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Eye className="h-4 w-4" />
                {post.viewCount}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-bold text-gray-900">{post.title}</h1>

            {post.excerpt && <p className="text-lg text-gray-600">{post.excerpt}</p>}

            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-gray prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-[#667eea] prose-strong:text-gray-900 max-w-none">
            {post.content.split("\n").map((line, idx) => {
              if (line.startsWith("### ")) {
                return (
                  <h3 key={idx} className="mb-3 mt-8 text-xl font-bold text-gray-900">
                    {line.replace("### ", "")}
                  </h3>
                )
              }
              if (line.startsWith("## ")) {
                return (
                  <h2 key={idx} className="mb-4 mt-10 text-2xl font-bold text-gray-900">
                    {line.replace("## ", "")}
                  </h2>
                )
              }
              if (line.startsWith("# ")) {
                return (
                  <h1 key={idx} className="mb-4 mt-10 text-3xl font-bold text-gray-900">
                    {line.replace("# ", "")}
                  </h1>
                )
              }
              if (line.startsWith("- ")) {
                return (
                  <li key={idx} className="ml-4 text-gray-600">
                    {line.replace("- ", "")}
                  </li>
                )
              }
              if (line.trim() === "") {
                return <br key={idx} />
              }
              return (
                <p key={idx} className="mb-4 text-gray-600">
                  {line}
                </p>
              )
            })}
          </div>

          {/* Author */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500">
              작성자: <span className="font-medium text-gray-700">{post.authorName}</span>
            </p>
          </div>

          {/* Back to list */}
          <div className="mt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#667eea] hover:text-purple-700"
            >
              <ArrowLeft className="h-4 w-4" />
              블로그 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
