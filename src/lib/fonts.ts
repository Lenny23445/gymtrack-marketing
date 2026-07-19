import { useEffect, useState } from 'react'

// Schriftarten + Schrifteffekte fuer alle Generatoren (Instagram, TikTok, Mockup,
// Video). Der Canvas rendert Text — deshalb muessen die Web-Fonts VOR dem Zeichnen
// geladen sein (document.fonts.load), sonst faellt Canvas auf System-Serif zurueck.
// Die Familien kommen per <link> aus Google Fonts (siehe index.html).

export type FontKey = 'sans' | 'script' | 'retro' | 'serif' | 'impact' | 'rounded'
export type EffectKey = 'none' | 'outline' | 'shadow' | 'glow' | 'sticker' | 'lift'

export interface TextStyle {
  font: FontKey
  effect: EffectKey
}

export const DEFAULT_STYLE: TextStyle = { font: 'sans', effect: 'none' }

// Canvas-taugliche Font-Stacks (Familiennamen exakt wie bei Google Fonts).
export const FONT_STACKS: Record<FontKey, string> = {
  sans: '-apple-system, "SF Pro Display", "Helvetica Neue", "Inter", sans-serif',
  script: '"Caveat", "Segoe Script", cursive',
  retro: '"Pacifico", "Brush Script MT", cursive',
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  impact: '"Anton", Impact, "Haettenschweiler", sans-serif',
  rounded: '"Fredoka", "SF Pro Rounded", "Segoe UI", sans-serif',
}

export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'sans', label: 'Standard', stack: FONT_STACKS.sans },
  { key: 'script', label: 'Schreibschrift', stack: FONT_STACKS.script },
  { key: 'retro', label: 'Retro', stack: FONT_STACKS.retro },
  { key: 'serif', label: 'Elegant', stack: FONT_STACKS.serif },
  { key: 'impact', label: 'Impact', stack: FONT_STACKS.impact },
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
  '700 100px "Caveat"',
  '400 100px "Caveat"',
  '400 100px "Pacifico"',
  '700 100px "Playfair Display"',
  '900 100px "Playfair Display"',
  '400 100px "Anton"',
  '700 100px "Fredoka"',
  '400 100px "Fredoka"',
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
