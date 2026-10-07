import { useCallback, useEffect, useState } from 'react'
import {
  cloudReady,
  cloudPutPool,
  cloudDeletePool,
  cloudMarkPoolUsed,
  cloudPutAccounts,
  cloudSubscribePool,
  type PoolDoc,
} from './cloud'
import { compressDataUrl, putBgFull } from './screenshots'

// Bilder-Pool pro TikTok-Konto: jedes Konto bekommt eigene Fotos je Slide-Position.
// Hintergrund: TikTok stuft Bilder, die (auch leicht verändert) auf mehreren Konten
// laufen, als „nicht originell" ein. Darum darf ein Bild nur in EINEM Konto liegen —
// geprüft per Ähnlichkeits-Fingerprint, nicht per Dateigleichheit (TikTok vergleicht
// ebenfalls nach Ähnlichkeit, Neu-Komprimieren oder Spiegeln hilft dort nicht).

export type PoolImg = PoolDoc

// Slide-Format je Konto: nur Einzel-Slides, nur mehrere Slides (Hook + Auflösung) oder gemischt.
export type SlideFormat = 'single' | 'multi' | 'mixed'
const FMT_KEY = 'tt-pool-formats'

// Ab diesem Bit-Abstand (von 64) gilt ein Bild als „dasselbe Motiv".
const SIMILAR_BITS = 10

// dHash: 9×8 Graustufen, je Zeile Nachbarn vergleichen → 64 Bit als 16 Hex.
function dHash(img: CanvasImageSource, flip: boolean): string {
  const c = document.createElement('canvas')
  c.width = 9
  c.height = 8
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return ''
  if (flip) {
    ctx.translate(9, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(img, 0, 0, 9, 8)
  const px = ctx.getImageData(0, 0, 9, 8).data
  const g = (x: number, y: number) => {
    const i = (y * 9 + x) * 4
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
  }
  let bits = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << 1n) | (g(x, y) < g(x + 1, y) ? 1n : 0n)
  return bits.toString(16).padStart(16, '0')
}

function hamming(a: string, b: string): number {
  if (!a || !b) return 64
  let v = BigInt('0x' + a) ^ BigInt('0x' + b)
  let n = 0
  while (v) {
    n += Number(v & 1n)
    v >>= 1n
  }
  return n
}

// Abstand zweier Pool-Bilder, Spiegelung eingerechnet.
function distance(a: { hash: string }, b: { hash: string; hashFlip: string }): number {
  return Math.min(hamming(a.hash, b.hash), hamming(a.hash, b.hashFlip))
}

// Ähnlichstes Bild aus einem ANDEREN Konto (oder null).
export function foreignTwin(img: { hash: string; account: string }, all: PoolImg[]): PoolImg | null {
  let best: PoolImg | null = null
  let bestD = SIMILAR_BITS + 1
  for (const o of all) {
    if (o.account === img.account) continue
    const d = distance(img, o)
    if (d < bestD) {
      best = o
      bestD = d
    }
  }
  return best
}

// ── Lokaler Cache (IndexedDB), damit der Pool offline + sofort da ist ─────────
const DB = 'gts-pool'
const STORE = 'imgs'
const ACC_KEY = 'tt-pool-accounts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function localAll(): Promise<PoolImg[]> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as PoolImg[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

// Lokalen Cache komplett durch den Cloud-Stand ersetzen.
async function localReplace(imgs: PoolImg[]): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const st = tx.objectStore(STORE)
      st.clear()
      for (const p of imgs) st.put(p)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* Cache ist optional */
  }
}

async function localPut(p: PoolImg): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function localDelete(id: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* egal */
  }
}

function readAccounts(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(ACC_KEY) ?? '[]')
    return Array.isArray(a) ? a.filter((n): n is string => typeof n === 'string') : []
  } catch {
    return []
  }
}
function writeAccounts(names: string[]) {
  try {
    localStorage.setItem(ACC_KEY, JSON.stringify(names))
  } catch {
    /* egal */
  }
}

function readFormats(): Record<string, SlideFormat> {
  try {
    const f = JSON.parse(localStorage.getItem(FMT_KEY) ?? '{}')
    return f && typeof f === 'object' ? f : {}
  } catch {
    return {}
  }
}
function writeFormats(f: Record<string, SlideFormat>) {
  try {
    localStorage.setItem(FMT_KEY, JSON.stringify(f))
  } catch {
    /* egal */
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

async function decodeFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface AddResult {
  added: PoolImg[]
  // Abgelehnt, weil dasselbe Motiv schon in einem anderen Konto liegt
  blocked: { name: string; account: string }[]
  // Übersprungen, weil schon im eigenen Pool
  dupes: string[]
  failed: string[]
}

export function usePool() {
  const [accounts, setAccounts] = useState<string[]>(() => readAccounts())
  const [imgs, setImgs] = useState<PoolImg[]>([])
  const [synced, setSynced] = useState(false)
  const [formats, setFormats] = useState<Record<string, SlideFormat>>(() => readFormats())

  useEffect(() => {
    let alive = true
    let unsub: (() => void) | null = null
    ;(async () => {
      const local = await localAll()
      if (alive) setImgs(local)
      if (!(await cloudReady()) || !alive) return
      unsub =
        cloudSubscribePool(async (acc, cloud, fmts) => {
          await localReplace(cloud)
          if (!alive) return
          setImgs(cloud)
          if (acc) {
            setAccounts(acc)
            writeAccounts(acc)
          }
          if (fmts) {
            setFormats(fmts as Record<string, SlideFormat>)
            writeFormats(fmts as Record<string, SlideFormat>)
          }
          setSynced(true)
        }) ?? null
    })()
    return () => {
      alive = false
      if (unsub) unsub()
    }
  }, [])

  const saveAccounts = useCallback(async (names: string[], fmts: Record<string, SlideFormat>) => {
    setAccounts(names)
    writeAccounts(names)
    setFormats(fmts)
    writeFormats(fmts)
    try {
      await cloudPutAccounts(names, fmts)
    } catch {
      /* lokal gespeichert */
    }
  }, [])

  const setFormat = useCallback(
    (name: string, f: SlideFormat) => saveAccounts(accounts, { ...formats, [name]: f }),
    [accounts, formats, saveAccounts],
  )

  const addAccount = useCallback(
    (name: string) => {
      const n = name.trim().replace(/^@/, '')
      if (!n || accounts.includes(n)) return
      saveAccounts([...accounts, n], formats)
    },
    [accounts, formats, saveAccounts],
  )

  // Konto nur löschen, wenn sein Pool leer ist — sonst verwaisen Bilder.
  const removeAccount = useCallback(
    (name: string) => {
      if (imgs.some(i => i.account === name)) return false
      const { [name]: _drop, ...rest } = formats
      saveAccounts(accounts.filter(a => a !== name), rest)
      return true
    },
    [accounts, formats, imgs, saveAccounts],
  )

  const addImages = useCallback(
    async (files: File[], account: string, slot: number): Promise<AddResult> => {
      const res: AddResult = { added: [], blocked: [], dupes: [], failed: [] }
      const known = [...imgs]
      for (const file of files) {
        if (file.type && !file.type.startsWith('image/')) {
          res.failed.push(file.name)
          continue
        }
        let full: HTMLImageElement
        try {
          full = await decodeFile(file)
        } catch {
          res.failed.push(file.name)
          continue
        }
        const hash = dHash(full, false)
        const hashFlip = dHash(full, true)
        const twin = foreignTwin({ hash, account }, known)
        if (twin) {
          res.blocked.push({ name: file.name, account: twin.account })
          continue
        }
        if (known.some(o => o.account === account && distance({ hash }, o) <= 4)) {
          res.dupes.push(file.name)
          continue
        }
        const id = 'pool-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
        const p: PoolImg = {
          id,
          account,
          slot,
          preview: await compressDataUrl(await fileToDataUrl(file), 1290),
          hash,
          hashFlip,
          createdAt: Date.now(),
          usedAt: 0,
        }
        try {
          await putBgFull(id, file) // Original in voller Auflösung, nur auf diesem Gerät
          await localPut(p)
        } catch {
          res.failed.push(file.name)
          continue
        }
        known.push(p)
        setImgs(prev => [...prev, p])
        res.added.push(p)
        try {
          await cloudPutPool(p)
        } catch {
          /* lokal da, Cloud folgt nicht automatisch */
        }
      }
      return res
    },
    [imgs],
  )

  const removeImg = useCallback(async (id: string) => {
    setImgs(prev => prev.filter(p => p.id !== id))
    await localDelete(id)
    try {
      await cloudDeletePool(id)
    } catch {
      /* lokal gelöscht */
    }
  }, [])

  const markUsed = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const at = Date.now()
    setImgs(prev => prev.map(p => (ids.includes(p.id) ? { ...p, usedAt: at } : p)))
    try {
      await cloudMarkPoolUsed(ids, at)
    } catch {
      /* nur Anzeige */
    }
  }, [])

  return { accounts, imgs, synced, formats, setFormat, addAccount, removeAccount, addImages, removeImg, markUsed }
}

// Bild für eine Slide-Position wählen: erst Bilder dieser Position, sonst andere
// des Kontos; am längsten unbenutzte zuerst, bei Gleichstand zufällig.
export function pickPoolImg(mine: PoolImg[], slot: number, taken: Set<string>, avoid?: string): PoolImg | null {
  const free = mine.filter(p => !taken.has(p.id))
  const pref = free.filter(p => p.id !== avoid)
  const bySlot = pref.filter(p => p.slot === slot)
  const list = bySlot.length ? bySlot : pref.length ? pref : free
  if (list.length === 0) return null
  const min = Math.min(...list.map(p => p.usedAt))
  const oldest = list.filter(p => p.usedAt === min)
  return oldest[Math.floor(Math.random() * oldest.length)]
}
