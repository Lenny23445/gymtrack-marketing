import { useEffect, useState } from 'react'

// Schriftarten + Schrifteffekte fuer alle Generatoren (Instagram, TikTok, Mockup,
// Video). Der Canvas rendert Text — deshalb muessen die Web-Fonts VOR dem Zeichnen
// geladen sein (document.fonts.load), sonst faellt Canvas auf System-Serif zurueck.
// Die Familien kommen per <link> aus Google Fonts (siehe index.html).

export type FontKey =
  | 'sans'
  | 'tiktok'
  | 'bebas'
  | 'archivo'
  | 'poppins'
  | 'oswald'
  | 'impact'
  | 'marker'
  | 'script'
  | 'retro'
  | 'serif'
  | 'rounded'
export type EffectKey = 'none' | 'outline' | 'shadow' | 'glow' | 'sticker' | 'lift'

export interface TextStyle {
  font: FontKey
  effect: EffectKey
}

export const DEFAULT_STYLE: TextStyle = { font: 'sans', effect: 'none' }

// Canvas-taugliche Font-Stacks (Familiennamen exakt wie bei Google Fonts).
export const FONT_STACKS: Record<FontKey, string> = {
  sans: '-apple-system, "SF Pro Display", "Helvetica Neue", "Inter", sans-serif',
  tiktok: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
  bebas: '"Bebas Neue", Impact, "Anton", sans-serif',
  archivo: '"Archivo Black", "Helvetica Neue", Arial, sans-serif',
  poppins: '"Poppins", "SF Pro Rounded", sans-serif',
  oswald: '"Oswald", "Bebas Neue", sans-serif',
  impact: '"Anton", Impact, "Haettenschweiler", sans-serif',
  marker: '"Permanent Marker", "Comic Sans MS", cursive',
  script: '"Caveat", "Segoe Script", cursive',
  retro: '"Righteous", "Bungee", "Arial Black", sans-serif',
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  rounded: '"Fredoka", "SF Pro Rounded", "Segoe UI", sans-serif',
}

// Gewicht fuer die HEADLINE/Body-700-Aufrufe pro Font. Manche Familien gibt es nur
// in einem Schnitt (Bebas/Anton/Righteous/Marker = 400, aber optisch fett), andere
// duerfen richtig schwer werden (TikTok-Look via Montserrat 800).
export const HEAD_WEIGHT: Record<FontKey, number> = {
  sans: 700,
  tiktok: 800,
  bebas: 400,
  archivo: 400,
  poppins: 800,
  oswald: 700,
  impact: 400,
  marker: 400,
  script: 700,
  retro: 400,
  serif: 800,
  rounded: 700,
}

export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'sans', label: 'Standard', stack: FONT_STACKS.sans },
  { key: 'tiktok', label: 'TikTok', stack: FONT_STACKS.tiktok },
  { key: 'bebas', label: 'Big', stack: FONT_STACKS.bebas },
  { key: 'archivo', label: 'Poster', stack: FONT_STACKS.archivo },
  { key: 'poppins', label: 'Modern', stack: FONT_STACKS.poppins },
  { key: 'oswald', label: 'Sport', stack: FONT_STACKS.oswald },
  { key: 'impact', label: 'Impact', stack: FONT_STACKS.impact },
  { key: 'marker', label: 'Marker', stack: FONT_STACKS.marker },
  { key: 'script', label: 'Schreibschrift', stack: FONT_STACKS.script },
  { key: 'retro', label: 'Retro', stack: FONT_STACKS.retro },
  { key: 'serif', label: 'Elegant', stack: FONT_STACKS.serif },
  { key: 'rounded', label: 'Rund', stack: FONT_STACKS.rounded },
]

export const EFFECTS: { key: EffectKey; label: string }[] = [
  { key: 'none', label: 'Kein' },
  { key: 'outline', label: 'Kontur' },
  { key: 'shadow', label: 'Schatten' },
  { key: 'glow', label: 'Neon' },
  { key: 'sticker', label: 'Bubble' },
  { key: 'lift', label: '3D' },
]

// Repraesentative Familie+Gewicht pro Web-Font, die tatsaechlich geladen werden
// muessen, bevor der Canvas sie nutzen kann. System-Sans ist immer da.
const LOAD_SPECS = [
  '800 100px "Montserrat"',
  '400 100px "Bebas Neue"',
  '400 100px "Archivo Black"',
  '800 100px "Poppins"',
  '700 100px "Oswald"',
  '400 100px "Anton"',
  '400 100px "Permanent Marker"',
  '700 100px "Caveat"',
  '400 100px "Caveat"',
  '400 100px "Righteous"',
  '800 100px "Playfair Display"',
  '700 100px "Fredoka"',
]

let preloadPromise: Promise<void> | null = null

// Alle Web-Fonts einmal vorladen. Idempotent (mehrfacher Aufruf teilt sich das
// Promise). Faellt still zurueck, falls das Font-CSS nicht erreichbar ist.
export function preloadFonts(): Promise<void> {
  if (preloadPromise) return preloadPromise
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (!fonts) {
    preloadPromise = Promise.resolve()
    return preloadPromise
  }
  preloadPromise = Promise.all(
    LOAD_SPECS.map(spec => fonts.load(spec).catch(() => undefined)),
  ).then(() => undefined)
  return preloadPromise
}

// React-Hook: false bis alle Fonts geladen sind, dann true. In die Zeichen-Effekte
// als Dependency haengen, damit die Vorschau nach dem Laden einmal neu rendert.
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    preloadFonts().finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  return ready
}
