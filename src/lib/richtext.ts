import type { FontKey } from './fonts'

// Rich-Text mit Inline-Farben UND Inline-Schriftarten. Frueher: Passagen per *Sternchen*
// in EINER Akzentfarbe. Neu: jede markierte Passage kann ihre eigene Farbe UND/ODER
// eigene Schrift tragen — im Editor per Auswahl + Klick gesetzt, hier als unsichtbares
// Token kodiert.
//
// Token-Form:  ⟦#RRGGBB@fontkey⟧text⟦/⟧   (beide Teile optional, mind. einer vorhanden)
//   nur Farbe:    ⟦#RRGGBB⟧text⟦/⟧
//   nur Schrift:  ⟦@fontkey⟧text⟦/⟧
//   beides:       ⟦#RRGGBB@fontkey⟧text⟦/⟧
// Legacy:      *text*  → wird als Akzentfarbe interpretiert (Abwaertskompatibilitaet,
//              die Generatoren erzeugen weiterhin Sternchen-Markup).

// Ein Rich-Token (Farbe/Schrift), ohne die Sternchen-Legacy. Text ist Gruppe 1.
export const TOKEN_RE = /⟦(?:#[0-9A-Fa-f]{6})?(?:@[a-z]+)?⟧([\s\S]*?)⟦\/⟧/g
const STAR_RE = /\*([^*\n]+)\*/g

export interface RichSeg {
  text: string
  hl?: boolean // legacy *…* → Akzentfarbe
  color?: string // explizite Farbe (#RRGGBB)
  font?: FontKey // explizite Schrift (Slide-Standard, wenn leer)
}

// Eine Roh-Zeile (oder ganzer Text) in Segmente zerlegen. Reihenfolge bleibt,
// Klartext zwischen den Markierungen kommt als eigenes Segment ohne Attribute.
export function parseRich(raw: string): RichSeg[] {
  const segs: RichSeg[] = []
  const re = /⟦(#[0-9A-Fa-f]{6})?(@[a-z]+)?⟧([\s\S]*?)⟦\/⟧|\*([^*\n]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    if (m.index > last) segs.push({ text: raw.slice(last, m.index) })
    if (m[3] !== undefined) {
      const color = m[1] ? '#' + m[1].slice(1).toUpperCase() : undefined
      const font = m[2] ? (m[2].slice(1) as FontKey) : undefined
      segs.push({ text: m[3], color, font })
    } else {
      segs.push({ text: m[4], hl: true })
    }
    last = m.index + m[0].length
  }
  if (last < raw.length) segs.push({ text: raw.slice(last) })
  return segs
}

// Markup entfernen — fuer Captions / Kopier-Text, wo weder Farbe/Schrift noch Sternchen sollen.
export function stripRich(raw: string): string {
  return raw.replace(TOKEN_RE, '$1').replace(STAR_RE, '$1')
}

// Ein Rich-Token bauen (Editor -> Wert). Ohne Attribute = Klartext.
export function wrapRich(text: string, color?: string, font?: FontKey): string {
  if (!color && !font) return text
  const c = color ? color.toUpperCase() : ''
  const f = font ? '@' + font : ''
  return `⟦${c}${f}⟧${text}⟦/⟧`
}

// Nur-Farbe-Variante (Abwaertskompatibilitaet fuer bestehende Aufrufer).
export function wrapColor(text: string, color?: string): string {
  return wrapRich(text, color)
}

// rgb(…)/rgba(…)/#hex → #RRGGBB (Grossbuchstaben). Fuer den Vergleich mit der
// Basisfarbe im Editor (computed style liefert rgb()).
export function toHex(input: string): string {
  const s = input.trim()
  if (s.startsWith('#')) {
    if (s.length === 4) return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase()
    return s.slice(0, 7).toUpperCase()
  }
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s)
  if (!m) return s.toUpperCase()
  const h = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0')
  return ('#' + h(m[1]) + h(m[2]) + h(m[3])).toUpperCase()
}
