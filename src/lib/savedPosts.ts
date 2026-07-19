import { useCallback, useEffect, useState } from 'react'
import type { Category, GeneratedPost, PostFormat, PostTheme, TikTokConcept, VAlign } from './types'
import type { TextStyle } from './fonts'

// Content-Datenbank: gespeicherte, RE-EDITIERBARE Posts.
// Anders als der alte Planner (nur Caption + Thumb) legen wir hier den kompletten
// Bearbeitungszustand ab, damit ein Post per Klick exakt so wieder im jeweiligen
// Generator geöffnet und nachbearbeitet werden kann — kein Neuanfang nötig.
// Eigene IndexedDB (nicht der Screenshot-Store), damit große Payloads + Thumbnails
// nicht am ~5-MB-localStorage-Limit scheitern.

export type SavedKind = 'ig' | 'tiktok' | 'mockup'

// Voller Zustand eines Instagram-Post-Generators
export interface IgPayload {
  post: GeneratedPost
  format: PostFormat
  theme: PostTheme
  accent: string
  aspect: '45' | '11'
  visual: 'typo' | 'shot' | 'promo'
  vAlign: VAlign
  shotId: string | null
  style?: TextStyle
}

// Voller Zustand des TikTok-Slide-Generators (Slides tragen ihre shotId selbst)
export interface TiktokPayload {
  concept: TikTokConcept
  theme: PostTheme
  accent: string
  style?: TextStyle
}

// Voller Zustand des Bild-Mockup-Studios
export interface MockupPayload {
  headline: string
  sub: string
  theme: PostTheme
  accent: string
  typeId: string
  shotId: string | null
  style?: TextStyle
}

export type SavedPayload =
  | { kind: 'ig'; data: IgPayload }
  | { kind: 'tiktok'; data: TiktokPayload }
  | { kind: 'mockup'; data: MockupPayload }

export interface SavedPost {
  id: string
  kind: SavedKind
  title: string
  category: Category
  thumb?: string
  createdAt: number
  updatedAt: number
  payload: SavedPayload
}

const DB = 'gts-posts-db'
const STORE = 'posts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function newPostId(): string {
  return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export async function listSaved(): Promise<SavedPost[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as SavedPost[]).sort((a, b) => b.updatedAt - a.updatedAt))
    req.onerror = () => reject(req.error)
  })
}

// Speichert neu ODER aktualisiert in-place (gleiche id). So wird aus „nacharbeiten"
// ein Update statt eines Duplikats.
export async function upsertSaved(post: SavedPost): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(post)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeSaved(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function useSaved() {
  const [saved, setSaved] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setSaved(await listSaved())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await removeSaved(id)
    await refresh()
  }, [refresh])

  return { saved, loading, refresh, remove }
}

export const KIND_META: Record<SavedKind, { label: string }> = {
  ig: { label: 'Instagram Post' },
  tiktok: { label: 'TikTok Slides' },
  mockup: { label: 'Mockup' },
}
