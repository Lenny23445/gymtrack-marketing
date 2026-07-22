import { useCallback, useEffect, useState } from 'react'
import type { Category, GeneratedPost, PostFormat, PostTheme, TikTokConcept, VAlign } from './types'
import type { TextStyle } from './fonts'
import { cloudReady, cloudPutPost, cloudDeletePost, cloudListPosts, cloudSubscribePosts } from './cloud'

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
  // Freie Anordnung: Textblock-Mittelpunkt + Geräte-Mittelpunkt/Skalierung (Anteile 0..1)
  layout?: {
    text?: { nx: number; ny: number }
    phone?: { nx: number; ny: number; scale: number }
  }
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

// Mehrere Posts in die lokale IndexedDB spiegeln (Cloud → lokaler Cache).
async function putManyLocal(posts: SavedPost[]): Promise<void> {
  if (posts.length === 0) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const p of posts) if (p?.id) store.put(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Speichert neu ODER aktualisiert in-place (gleiche id). So wird aus „nacharbeiten"
// ein Update statt eines Duplikats. Zusätzlich in die geteilte Cloud (fail-soft):
// so sieht die Freundin die Bearbeitung und kann sie weiterbearbeiten.
export async function upsertSaved(post: SavedPost): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(post)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  try {
    if (await cloudReady()) await cloudPutPost(post)
  } catch {
    /* lokal gespeichert, Cloud folgt beim nächsten Mal / zu groß fürs Cloud-Limit */
  }
}

export async function removeSaved(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  try {
    await cloudDeletePost(id)
  } catch {
    /* lokal gelöscht, Cloud folgt später */
  }
}

// Cloud + lokal zu EINER Liste zusammenführen: bei gleicher id gewinnt der neuere
// Stand (updatedAt). So gehen weder lokale noch geteilte Bearbeitungen verloren.
function mergePosts(a: SavedPost[], b: SavedPost[]): SavedPost[] {
  const map = new Map<string, SavedPost>()
  for (const p of [...a, ...b]) {
    const prev = map.get(p.id)
    if (!prev || p.updatedAt >= prev.updatedAt) map.set(p.id, p)
  }
  return [...map.values()].sort((x, y) => y.updatedAt - x.updatedAt)
}

// Geteilte Content-Datenbank: lokal sofort zeigen, dann mit der Cloud synchronisieren.
// `synced` = true, sobald das Live-Abo läuft (Posts sind dann geteilt).
export function useSaved() {
  const [saved, setSaved] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setSaved(await listSaved())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    let unsub: (() => void) | null = null
    ;(async () => {
      // 1) Lokale Datenbank sofort zeigen
      const local = await listSaved()
      if (!alive) return
      setSaved(local)
      setLoading(false)

      // 2) Cloud verbinden (fail-soft)
      const ok = await cloudReady()
      if (!ok || !alive) return

      // 3) Migration: lokale Posts, die noch nicht (oder älter) in der Cloud sind, hochladen
      let cloudPosts: SavedPost[]
      try {
        cloudPosts = await cloudListPosts()
      } catch {
        return // keine Rechte/offline → lokal bleiben
      }
      const cloudById = new Map(cloudPosts.map(p => [p.id, p]))
      for (const p of local) {
        const c = cloudById.get(p.id)
        if (c && c.updatedAt >= p.updatedAt) continue
        try {
          await cloudPutPost(p)
        } catch {
          /* einzelnen Post überspringen (z. B. zu groß) */
        }
      }

      // 4) Live-Abo: Cloud + lokal mergen, Ergebnis lokal spiegeln (Offline-Cache)
      unsub =
        cloudSubscribePosts(
          async cloud => {
            const localNow = await listSaved()
            const merged = mergePosts(cloud, localNow)
            await putManyLocal(cloud)
            if (alive) {
              setSaved(merged)
              setSynced(true)
            }
          },
          () => {
            /* lokaler Modus */
          },
        ) ?? null
    })()
    return () => {
      alive = false
      if (unsub) unsub()
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    await removeSaved(id)
    setSaved(prev => prev.filter(p => p.id !== id))
  }, [])

  return { saved, loading, synced, refresh, remove }
}

export const KIND_META: Record<SavedKind, { label: string }> = {
  ig: { label: 'Instagram Post' },
  tiktok: { label: 'TikTok Slides' },
  mockup: { label: 'Mockup' },
}
