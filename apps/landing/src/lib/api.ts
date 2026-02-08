const ENGINE_STUDIO_URL = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL || "http://localhost:3000"

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImageUrl: string | null
  category: string
  tags: string[]
  publishedAt: string | null
  viewCount: number
  authorName: string
}

interface BlogListResponse {
  success: boolean
  data: {
    posts: BlogPost[]
    total: number
    page: number
    hasMore: boolean
  }
}

interface BlogDetailResponse {
  success: boolean
  data: BlogPost
}

interface PersonaPublic {
  id: string
  name: string
  handle: string
  tagline: string | null
  role: string
  expertise: string[]
  profileImageUrl: string | null
  warmth: number
  vector: Record<string, number> | null
  postCount: number
  followerCount: number
}

interface PersonaListResponse {
  success: boolean
  data: {
    personas: PersonaPublic[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

export type { BlogPost, PersonaPublic }

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${ENGINE_STUDIO_URL}${path}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getBlogPosts(params?: {
  limit?: number
  page?: number
  category?: string
}): Promise<BlogListResponse["data"]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.category) searchParams.set("category", String(params.category))

  const qs = searchParams.toString()
  const res = await fetchApi<BlogListResponse>(`/api/public/blog${qs ? `?${qs}` : ""}`)
  return res.data
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  const res = await fetchApi<BlogDetailResponse>(`/api/public/blog/${slug}`)
  return res.data
}

export async function getTopPersonas(limit = 3): Promise<PersonaPublic[]> {
  const res = await fetchApi<PersonaListResponse>(
    `/api/public/personas?limit=${limit}&sortBy=followers`
  )
  return res.data.personas
}

export async function getPersonas(params?: {
  limit?: number
  page?: number
}): Promise<PersonaListResponse["data"]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.page) searchParams.set("page", String(params.page))

  const qs = searchParams.toString()
  const res = await fetchApi<PersonaListResponse>(`/api/public/personas${qs ? `?${qs}` : ""}`)
  return res.data
}
