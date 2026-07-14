import type { PlannedPost } from './types'

const KEY = 'gts.planned.v1'

export function loadPlanned(): PlannedPost[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(posts: PlannedPost[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(posts))
  } catch {
    // Quota voll (Thumbnails): ohne Thumbs erneut versuchen
    localStorage.setItem(KEY, JSON.stringify(posts.map(p => ({ ...p, thumb: undefined }))))
  }
}

export function addPlanned(post: PlannedPost): PlannedPost[] {
  const posts = [post, ...loadPlanned()]
  save(posts)
  return posts
}

export function updatePlanned(id: string, patch: Partial<PlannedPost>): PlannedPost[] {
  const posts = loadPlanned().map(p => (p.id === id ? { ...p, ...patch } : p))
  save(posts)
  return posts
}

export function removePlanned(id: string): PlannedPost[] {
  const posts = loadPlanned().filter(p => p.id !== id)
  save(posts)
  return posts
}
