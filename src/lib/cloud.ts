import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Shot } from './screenshots'

// Geteilte, synchronisierte Screenshot-Bibliothek über Firebase Firestore.
// Bewusst dasselbe Firebase-Projekt wie die GymTrack-App (gymtrack-25d39) — dort
// ist Anonymous-Auth bereits aktiv und der Share-Flow speichert Bilder ebenfalls
// als komprimiertes base64 direkt im Firestore-Dokument (kein Storage/Blaze nötig).
//
// Alle Aufrufe sind FAIL-SOFT: schlägt die Cloud fehl (offline, Regeln fehlen),
// läuft das Tool unverändert lokal weiter — nichts wirft nach außen.

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCwhyqYm8m3R2grLNjE1wf6o4hNSVta6YA',
  authDomain: 'gymtrack-25d39.firebaseapp.com',
  databaseURL: 'https://gymtrack-25d39-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'gymtrack-25d39',
  storageBucket: 'gymtrack-25d39.firebasestorage.app',
  messagingSenderId: '404501862861',
  appId: '1:404501862861:web:07e975faa3923a1dc44c84',
}

// Eigene Collection, getrennt von den GymTrack-Nutzerdaten.
const COLLECTION = 'mkt_screenshots'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let readyPromise: Promise<boolean> | null = null

// Firebase initialisieren + anonym anmelden (die Firestore-Regeln verlangen
// request.auth != null). Gibt true zurück, wenn Auth klappt. ACHTUNG: true heißt
// nur „angemeldet" — ob Reads/Writes erlaubt sind, entscheiden die Regeln; darum
// sind alle Datenzugriffe zusätzlich in try/catch gekapselt.
export function cloudReady(): Promise<boolean> {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    try {
      app = initializeApp(FIREBASE_CONFIG)
      db = getFirestore(app)
      const auth = getAuth(app)
      await new Promise<void>((resolve, reject) => {
        const off = onAuthStateChanged(auth, u => {
          if (u) {
            off()
            resolve()
          }
        })
        signInAnonymously(auth).catch(reject)
      })
      return true
    } catch (e) {
      console.warn('[cloud] nicht verfügbar — lokaler Modus:', e)
      db = null
      return false
    }
  })()
  return readyPromise
}

function fromDoc(id: string, data: Record<string, unknown>): Shot {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'screenshot',
    dataUrl: typeof data.dataUrl === 'string' ? data.dataUrl : '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  }
}

// Einen Screenshot in die Cloud schreiben (Doc-ID = Shot-ID → idempotent).
export async function cloudPut(shot: Shot): Promise<void> {
  if (!db) return
  await setDoc(doc(db, COLLECTION, shot.id), {
    name: shot.name,
    dataUrl: shot.dataUrl,
    createdAt: shot.createdAt,
  })
}

export async function cloudDelete(id: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, COLLECTION, id))
}

// Einmaliger Abruf aller Cloud-Screenshots (für die Migration lokaler Bilder).
export async function cloudList(): Promise<Shot[]> {
  if (!db) return []
  const snap = await getDocs(collection(db, COLLECTION))
  return snap.docs.map(d => fromDoc(d.id, d.data() as Record<string, unknown>))
}

// Live-Abo: liefert bei jeder Änderung die komplette geteilte Bibliothek.
// Gibt null zurück, wenn die Cloud nicht verfügbar ist. Der Fehler-Callback
// (fehlende Regeln/permission-denied) lässt das Tool still lokal weiterlaufen.
export function cloudSubscribe(
  onShots: (shots: Shot[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe | null {
  if (!db) return null
  return onSnapshot(
    collection(db, COLLECTION),
    snap => onShots(snap.docs.map(d => fromDoc(d.id, d.data() as Record<string, unknown>))),
    err => {
      console.warn('[cloud] Snapshot-Fehler — lokaler Modus:', err)
      onError?.(err)
    },
  )
}
