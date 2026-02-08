import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Calendar, Eye } from "lucide-react"
import { getBlogPosts } from "@/lib/api"

export const metadata: Metadata = {
  title: "Blog",
  description: "DeepSight의 기술, 제품, 인사이트에 대한 블로그 포스트를 읽어보세요.",
}

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

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof getBlogPosts>> = {
    posts: [],
    total: 0,
    page: 1,
    hasMore: false,
  }

  try {
    posts = await getBlogPosts({ limit: 20 })
  } catch {
    // API 미연결 시 빈 배열
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            BLOG
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">DeepSight Blog</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            AI 페르소나, 추천 시스템, 6D 벡터 기술에 대한 이야기를 나눕니다.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          {posts.posts.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2">
              {posts.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-gray-700"}`}
                    >
                      {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-[#667eea]">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Eye className="h-3 w-3" />
                      {post.viewCount}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#667eea] opacity-0 transition-opacity group-hover:opacity-100">
                    읽기
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                아직 게시된 블로그 포스트가 없습니다.
                <br />곧 새로운 글이 게시될 예정입니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
