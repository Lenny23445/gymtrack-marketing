import { useCallback, useEffect, useState } from 'react'

// Persistente Screenshot-Bibliothek in IndexedDB. Bilder bleiben lokal auf dem
// Geraet (kein Upload irgendwohin) und sind in allen Generatoren abrufbar.
// IndexedDB statt localStorage, weil viele Screenshots das ~5-MB-Limit sprengen.

export interface Shot {
  id: string
  name: string
  dataUrl: string
  createdAt: number
}

const DB = 'gts-db'
const STORE = 'screenshots'

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

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht dekodiert werden.'))
    img.src = dataUrl
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export async function listShots(): Promise<Shot[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as Shot[]).sort((a, b) => b.createdAt - a.createdAt))
    req.onerror = () => reject(req.error)
  })
}

export async function addShot(file: File): Promise<Shot> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error(`„${file.name}“ ist kein Bild.`)
  }
  const dataUrl = await fileToDataUrl(file)
  try {
    await loadImage(dataUrl) // HEIC/kaputte Datei -> hier abfangen, nicht speichern
  } catch {
    throw new Error(`„${file.name}“ konnte nicht gelesen werden (evtl. HEIC — als PNG/JPG exportieren).`)
  }
  const shot: Shot = {
    id: 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: file.name || 'screenshot',
    dataUrl,
    createdAt: Date.now(),
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(shot)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return shot
}

export async function getShot(id: string): Promise<Shot | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Shot | undefined)
    req.onerror = () => reject(req.error)
  })
}

// Screenshot per ID direkt als geladenes Bild holen (z. B. zum Re-Rendern eines
// gespeicherten Posts). Fehlt der Screenshot (gelöscht), kommt null zurück.
export async function loadShotImage(id: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!id) return null
  const shot = await getShot(id)
  if (!shot) return null
  try {
    return await loadImage(shot.dataUrl)
  } catch {
    return null
  }
}

export async function removeShot(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Seed: mitgelieferte Screenshots ─────────────────────────────────────────
// Damit ein geteilter Link (z. B. fuer die Marketing-Person) die Screenshots
// schon FERTIG enthaelt, liefern wir sie als statische Datei `public/seed-shots.json`
// mit und spielen sie beim ersten Laden einmalig in die lokale IndexedDB ein.
// Idempotent: pro `version` nur einmal (localStorage-Flag), damit vom Nutzer
// geloeschte Seeds nicht wieder auftauchen. Neue Version im JSON = neu einspielen.

interface SeedFile {
  version?: number
  shots?: Shot[]
}

const SEED_FLAG = 'gts-seed-version'

// Beim App-Start aufrufen (main.tsx) VOR dem ersten Render. Gibt true zurueck,
// wenn tatsaechlich etwas neu eingespielt wurde. Faellt still zurueck.
export async function seedScreenshots(): Promise<boolean> {
  try {
    const url = `${import.meta.env.BASE_URL}seed-shots.json`
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return false
    const data = (await res.json()) as SeedFile
    const shots = (data.shots ?? []).filter(s => s && s.id && s.dataUrl)
    const version = String(data.version ?? 1)
    if (shots.length === 0) return false
    if (localStorage.getItem(SEED_FLAG) === version) return false

    const existing = new Set((await listShots()).map(s => s.id))
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      for (const s of shots) if (!existing.has(s.id)) store.put(s)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    localStorage.setItem(SEED_FLAG, version)
    return true
  } catch {
    return false
  }
}

// Aktuelle Bibliothek als seed-shots.json exportieren — die Datei dann in den
// Projektordner `public/` legen und pushen, damit alle den Link mit Screenshots
// bekommen. `version` hochzaehlen, wenn schon einmal geseedet wurde.
export async function exportSeed(version = Date.now()): Promise<number> {
  const shots = await listShots()
  const json = JSON.stringify({ version, shots })
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'seed-shots.json'
  a.click()
  URL.revokeObjectURL(a.href)
  return shots.length
}

export function useShots() {
  const [shots, setShots] = useState<Shot[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setShots(await listShots())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (file: File) => {
    const s = await addShot(file)
    await refresh()
    return s
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await removeShot(id)
    await refresh()
  }, [refresh])

  return { shots, loading, add, remove }
}
