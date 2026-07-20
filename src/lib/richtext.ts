// Rich-Text mit Inline-Farben. Frueher wurden Passagen per *Sternchen* in EINER
// Akzentfarbe markiert. Neu: jede markierte Passage kann ihre EIGENE Farbe tragen —
// im Editor per Auswahl + Farb-Klick gesetzt, hier als unsichtbares Token kodiert.
//
// Token-Form:  ⟦#RRGGBB⟧text⟦/⟧   (seltene Klammern → kollidiert nicht mit Text)
// Legacy:      *text*  → wird als Akzentfarbe interpretiert (Abwaertskompatibilitaet,
//              die Generatoren erzeugen weiterhin Sternchen-Markup).

export const COLOR_RE = /⟦#([0-9A-Fa-f]{6})⟧([\s\S]*?)⟦\/⟧/g
const STAR_RE = /\*([^*\n]+)\*/g

export interface RichSeg {
  text: string
  hl?: boolean // legacy *…* → Akzentfarbe
  color?: string // explizite Farbe (#RRGGBB)
}

// Eine Roh-Zeile (oder ganzer Text) in Farb-Segmente zerlegen. Reihenfolge bleibt,
// Klartext zwischen den Markierungen kommt als eigenes Segment ohne Farbe.
export function parseRich(raw: string): RichSeg[] {
  const segs: RichSeg[] = []
  const re = /⟦#([0-9A-Fa-f]{6})⟧([\s\S]*?)⟦\/⟧|\*([^*\n]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    if (m.index > last) segs.push({ text: raw.slice(last, m.index) })
    if (m[1] != null) segs.push({ text: m[2], color: '#' + m[1].toUpperCase() })
    else segs.push({ text: m[3], hl: true })
    last = m.index + m[0].length
  }
  if (last < raw.length) segs.push({ text: raw.slice(last) })
  return segs
}

// Markup entfernen — fuer Captions / Kopier-Text, wo weder Farbe noch Sternchen sollen.
export function stripRich(raw: string): string {
  return raw.replace(COLOR_RE, '$2').replace(STAR_RE, '$1')
}

// Ein farbiges Token bauen (Editor -> Wert). Farbe leer/undefined = Klartext.
export function wrapColor(text: string, color?: string): string {
  if (!color) return text
  return `⟦${color.toUpperCase()}⟧${text}⟦/⟧`
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
