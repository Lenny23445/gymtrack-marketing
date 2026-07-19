import { useCallback, useEffect, useState } from 'react'
import { cloudReady, cloudPut, cloudDelete, cloudList, cloudSubscribe } from './cloud'

// Screenshot-Bibliothek: lokal in IndexedDB (Offline + schneller Zugriff über die
// Bild-ID beim Re-Rendern) UND geteilt über Firebase (siehe cloud.ts). So sehen
// alle mit dem geteilten Link dieselben Screenshots, und neue Uploads einer Person
// tauchen bei der anderen auf. Ohne Cloud (offline/Regeln fehlen) läuft alles lokal.

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

// Bild verkleinern + als JPEG komprimieren, damit es unter das Firestore-1-MB-Doc-
// Limit passt (wie der GymTrack-Share-Flow). Fällt bei Fehlern auf das Original zurück.
export async function compressDataUrl(dataUrl: string, maxDim = 1290, maxChars = 900_000): Promise<string> {
  try {
    const img = await loadImage(dataUrl)
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, w, h)
    let q = 0.85
    let out = canvas.toDataURL('image/jpeg', q)
    while (out.length > maxChars && q > 0.4) {
      q -= 0.1
      out = canvas.toDataURL('image/jpeg', q)
    }
    return out
  } catch {
    return dataUrl
  }
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

// Mehrere Screenshots in die lokale IndexedDB spiegeln (Cloud → lokaler Cache).
export async function putManyLocal(shots: Shot[]): Promise<void> {
  if (shots.length === 0) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const s of shots) if (s.id && s.dataUrl) store.put(s)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function addShot(file: File): Promise<Shot> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error(`„${file.name}“ ist kein Bild.`)
  }
  const raw = await fileToDataUrl(file)
  try {
    await loadImage(raw) // HEIC/kaputte Datei -> hier abfangen, nicht speichern
  } catch {
    throw new Error(`„${file.name}“ konnte nicht gelesen werden (evtl. HEIC — als PNG/JPG exportieren).`)
  }
  // Komprimieren, damit der Screenshot auch in die geteilte Cloud passt.
  const dataUrl = await compressDataUrl(raw)
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

// Geteilte Bibliothek: lokal sofort anzeigen, dann mit der Cloud synchronisieren.
// `synced` = true, sobald das Live-Abo läuft (Screenshots sind dann geteilt).
export function useShots() {
  const [shots, setShots] = useState<Shot[]>([])
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)

  const sortByNew = (arr: Shot[]) => [...arr].sort((a, b) => b.createdAt - a.createdAt)

  useEffect(() => {
    let alive = true
    let unsub: (() => void) | null = null
    ;(async () => {
      // 1) Lokale Bibliothek sofort zeigen
      const local = await listShots()
      if (!alive) return
      setShots(sortByNew(local))
      setLoading(false)

      // 2) Cloud verbinden (fail-soft)
      const ok = await cloudReady()
      if (!ok || !alive) return

      // 3) Migration: lokale Screenshots, die noch nicht in der Cloud sind, hochladen
      let cloudShots: Shot[]
      try {
        cloudShots = await cloudList()
      } catch {
        return // keine Rechte/offline -> lokal bleiben
      }
      const cloudIds = new Set(cloudShots.map(s => s.id))
      for (const s of local) {
        if (cloudIds.has(s.id)) continue
        try {
          await cloudPut({ ...s, dataUrl: await compressDataUrl(s.dataUrl) })
        } catch {
          /* einzelnes Bild überspringen */
        }
      }

      // 4) Live-Abo: Cloud = geteilte Wahrheit, lokal spiegeln (Offline + by-ID)
      unsub =
        cloudSubscribe(
          async cloud => {
            await putManyLocal(cloud)
            if (alive) {
              setShots(sortByNew(cloud))
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

  const add = useCallback(async (file: File) => {
    const s = await addShot(file)
    setShots(prev => sortByNew([s, ...prev.filter(x => x.id !== s.id)]))
    try {
      if (await cloudReady()) await cloudPut(s)
    } catch {
      /* lokal gespeichert, Cloud folgt später */
    }
    return s
  }, [])

  const remove = useCallback(async (id: string) => {
    await removeShot(id)
    setShots(prev => prev.filter(x => x.id !== id))
    try {
      await cloudDelete(id)
    } catch {
      /* lokal gelöscht */
    }
  }, [])

  return { shots, loading, synced, add, remove }
}
