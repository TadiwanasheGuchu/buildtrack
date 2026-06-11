import type { CreatePostData, Post } from '@/types/feed'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiPost {
  id: string
  project_id: string
  project_name: string
  author_id: string
  author_name: string
  author_avatar_url?: string
  content: string
  image_url?: string
  created_at: string
}

function toPost(r: ApiPost): Post {
  return {
    id: r.id,
    projectId: r.project_id,
    projectName: r.project_name,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatarUrl: r.author_avatar_url,
    content: r.content,
    imageUrl: r.image_url,
    createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

let demoPosts: Post[] = [
  {
    id: 'p1', projectId: '3', projectName: 'Cape Town Logistics Hub',
    authorId: '2', authorName: 'Amara Diallo', authorAvatarUrl: undefined,
    content: 'MEP installation on the east wing is complete. All electrical conduit runs and DB boards signed off by the engineer. Moving to fire suppression system next week.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p2', projectId: '1', projectName: 'Southern Ridge Residential',
    authorId: '1', authorName: 'Thabo Nkosi', authorAvatarUrl: undefined,
    content: 'Roofing crew has started on Block B. Weather is clear — targeting completion of waterproofing membrane by end of Friday. Block A membrane passed the ponding test.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p3', projectId: '2', projectName: 'Harare High-Rise Extension',
    authorId: '3', authorName: 'Kemi Adeola', authorAvatarUrl: undefined,
    content: 'Logistics delay confirmed — steel delivery from Hwange delayed by 4 days due to rail congestion. Contractor notified. No impact on critical path yet; monitoring closely.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p4', projectId: '1', projectName: 'Southern Ridge Residential',
    authorId: '2', authorName: 'Amara Diallo', authorAvatarUrl: undefined,
    content: 'Safety inspection passed. All PPE compliance at 98% across the site. New safety signage installed at the material staging area. Next inspection scheduled in 14 days.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p5', projectId: '3', projectName: 'Cape Town Logistics Hub',
    authorId: '1', authorName: 'Thabo Nkosi', authorAvatarUrl: undefined,
    content: 'Client walkthrough completed successfully. Impressed with the automated dock levellers and the solar roof integration. Requested minor changes to security booth positioning — drawings updated.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p6', projectId: '5', projectName: 'Lusaka Road Overpass',
    authorId: '3', authorName: 'Kemi Adeola', authorAvatarUrl: undefined,
    content: 'Piling works are running 10 days behind schedule due to unexpected rock layer at 4m depth. Engaged specialist drill rig from Ndola — on site Monday. Revised programme submitted to client.',
    imageUrl: undefined,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

let nextId = 200

// ── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: authHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Feed ───────────────────────────────────────────────────────────────────

export async function getPosts(projectId?: string, skip = 0, limit = 20): Promise<Post[]> {
  if (DEMO) {
    const filtered = projectId
      ? demoPosts.filter(p => p.projectId === projectId)
      : [...demoPosts]
    return filtered.slice(skip, skip + limit)
  }
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (projectId) params.set('project_id', projectId)
  const raw = await api<ApiPost[]>(`/feed?${params}`)
  return raw.map(toPost)
}

export async function createPost(data: CreatePostData): Promise<Post> {
  if (DEMO) {
    const post: Post = {
      id: String(nextId++),
      projectId: data.projectId,
      projectName: 'Your Project',
      authorId: '1',
      authorName: 'You',
      content: data.content,
      imageUrl: data.imageUrl,
      createdAt: new Date().toISOString(),
    }
    demoPosts = [post, ...demoPosts]
    return post
  }
  const raw = await api<ApiPost>('/feed', {
    method: 'POST',
    body: JSON.stringify({
      project_id: data.projectId,
      content: data.content,
      image_url: data.imageUrl ?? null,
    }),
  })
  return toPost(raw)
}

export async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/feed/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? 'Upload failed')
  }
  const { url } = await res.json() as { url: string }
  return url
}
