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
