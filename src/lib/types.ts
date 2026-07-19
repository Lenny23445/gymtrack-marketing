export type Category =
  | 'education'
  | 'problem'
  | 'feature'
  | 'motivation'
  | 'comparison'
  | 'community'

export type PostFormat = 'single' | 'carousel' | 'story'
export type PostTheme = 'dark' | 'light'

export interface Idea {
  id: string
  cat: Category
  title: string
  short: string
  cta?: string
}

export interface Slide {
  kind: 'cover' | 'point' | 'cta' | 'shot'
  heading: string
  body?: string
  index: number
  total: number
  // Screenshot einblenden: Slide behaelt Texte, rendert aber mit Geraet
  withShot?: boolean
}

export interface GeneratedPost {
  id: string
  ideaId: string
  category: Category
  format: PostFormat
  theme: PostTheme
  headline: string
  sub: string
  hook: string
  caption: string
  cta: string
  question: string
  hashtags: string[]
  slides?: Slide[]
  createdAt: number
}

export interface ScoreAxis {
  label: string
  value: number
}

export interface Score {
  axes: ScoreAxis[]
  total: number
  suggestions: string[]
}

export type VAlign = 'top' | 'center' | 'bottom'

// Frei platzierbarer Sticker (importiertes Bild). Position als Anteil der
// Canvas-Maße (0..1), damit er unabhängig von der Vorschaugröße sitzt.
export interface Sticker {
  id: string
  dataUrl: string
  nx: number // Mittelpunkt X, Anteil der Breite
  ny: number // Mittelpunkt Y, Anteil der Höhe
  nscale: number // Breite als Anteil der Canvas-Breite
}

export interface TikTokSlide {
  text: string
  note: string
  kind?: 'text' | 'shot'
  align?: VAlign
  // Screenshot-Slides: eigenes Bild pro Slide (ID aus der Screenshot-Bibliothek)
  shotId?: string
  // Frei platzierte Sticker auf diesem Slide
  stickers?: Sticker[]
}

export interface TikTokConcept {
  ideaId: string
  category: Category
  hookType: string
  slides: TikTokSlide[]
  caption: string
  hashtags: string[]
  sound: { vibe: string; how: string }
  postingTip: string
  plan: string[]
}

export const CATEGORY_META: Record<Category, { label: string; kicker: string }> = {
  education: { label: 'Education', kicker: 'WISSEN' },
  problem: { label: 'Problem Awareness', kicker: 'REAL TALK' },
  feature: { label: 'App-Vorteile', kicker: 'MY GYM TRACK' },
  motivation: { label: 'Motivation', kicker: 'MINDSET' },
  comparison: { label: 'Vergleich', kicker: 'VERGLEICH' },
  community: { label: 'Community', kicker: 'COMMUNITY' },
}

export const FORMAT_META: Record<PostFormat, { label: string; w: number; h: number }> = {
  single: { label: 'Single Post', w: 1080, h: 1350 },
  carousel: { label: 'Carousel', w: 1080, h: 1350 },
  story: { label: 'Story', w: 1080, h: 1920 },
}
