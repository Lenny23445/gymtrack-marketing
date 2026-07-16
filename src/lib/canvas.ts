import type { PostTheme, Slide } from './types'

// Rendering-Engine: zeichnet Posts in Instagram-Aufloesung (1080er) auf Canvas.
// Design-Sprache: Apple-like — viel Weissraum, klare Typo, schwarz/weiss.

const FONT = '"SF Pro Display", "Helvetica Neue", "Inter", -apple-system, sans-serif'

interface Palette {
  bg: string
  fg: string
  muted: string
  line: string
}

export const PALETTES: Record<PostTheme, Palette> = {
  dark: { bg: '#0A0A0A', fg: '#FFFFFF', muted: 'rgba(255,255,255,0.55)', line: 'rgba(255,255,255,0.16)' },
  light: { bg: '#FAFAFA', fg: '#0A0A0A', muted: 'rgba(10,10,10,0.55)', line: 'rgba(10,10,10,0.14)' },
}

const PAD = 96

function ctx2d(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'
  return ctx
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Findet die groesste Schriftgroesse <= base, bei der der Text in maxLines passt
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  base: number,
  min: number,
  maxLines: number,
  weight: number,
): { size: number; lines: string[] } {
  for (let size = base; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = `${weight} ${min}px ${FONT}`
  return { size: min, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) }
}

// ── Rich-Text: Inline-Markup *so* faerbt einzelne Passagen in einer Akzentfarbe ──
// Genutzt in allen Render-Pfaden (Post, Slide, Mockup, TikTok, Video). Marketing
// schreibt z.B. "Logge Saetze in *Sekunden*" — "Sekunden" wird dann farbig gerendert.

export const DEFAULT_ACCENT = '#0A84FF'

export interface RichTok { text: string; hl: boolean; spaceBefore: boolean }

// Parst *…*-Paare zu Segmenten (Markup entfernt). Ein einzelnes * ohne Partner
// bleibt Literal, Zeilenumbrueche brechen ein Highlight nicht ueber die Zeile.
function parseRich(raw: string): { text: string; hl: boolean }[] {
  const segs: { text: string; hl: boolean }[] = []
  const re = /\*([^*\n]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    if (m.index > last) segs.push({ text: raw.slice(last, m.index), hl: false })
    segs.push({ text: m[1], hl: true })
    last = m.index + m[0].length
  }
  if (last < raw.length) segs.push({ text: raw.slice(last), hl: false })
  return segs
}

// Markup entfernen — fuer Captions / Copy, wo die Sternchen nicht auftauchen sollen.
export function stripRich(raw: string): string {
  return raw.replace(/\*([^*\n]+)\*/g, '$1')
}

// In Wort-Tokens mit Highlight-Flag zerlegen (Highlight auf Wortgrenzen).
export function tokenizeRich(raw: string): RichTok[] {
  const toks: RichTok[] = []
  let pendingSpace = false
  let started = false
  for (const seg of parseRich(raw)) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (part === '') continue
      if (/^\s+$/.test(part)) { pendingSpace = true; continue }
      toks.push({ text: part, hl: seg.hl, spaceBefore: started && pendingSpace })
      pendingSpace = false
      started = true
    }
  }
  return toks
}

function richLineWidth(ctx: CanvasRenderingContext2D, line: RichTok[]): number {
  const spaceW = ctx.measureText(' ').width
  let w = 0
  line.forEach((t, i) => {
    if (i > 0 && t.spaceBefore) w += spaceW
    w += ctx.measureText(t.text).width
  })
  return w
}

function richWrap(ctx: CanvasRenderingContext2D, toks: RichTok[], maxWidth: number): RichTok[][] {
  const spaceW = ctx.measureText(' ').width
  const lines: RichTok[][] = []
  let line: RichTok[] = []
  let w = 0
  for (const t of toks) {
    const tw = ctx.measureText(t.text).width
    const lead = line.length > 0 && t.spaceBefore ? spaceW : 0
    if (line.length > 0 && w + lead + tw > maxWidth) {
      lines.push(line)
      line = [{ ...t, spaceBefore: false }]
      w = tw
    } else {
      line.push(t)
      w += lead + tw
    }
  }
  if (line.length) lines.push(line)
  return lines
}

// Wie fitText, aber liefert Zeilen als Highlight-Segmente statt Strings.
export function richFit(
  ctx: CanvasRenderingContext2D,
  raw: string,
  maxWidth: number,
  base: number,
  min: number,
  maxLines: number,
  weight: number,
): { size: number; lines: RichTok[][] } {
  const toks = tokenizeRich(raw)
  for (let size = base; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`
    const lines = richWrap(ctx, toks, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = `${weight} ${min}px ${FONT}`
  return { size: min, lines: richWrap(ctx, toks, maxWidth).slice(0, maxLines) }
}

// Zeichnet eine Zeile mit Highlight-Segmenten. Font vorher setzen.
// align='left': x = linke Kante · align='center': x = Mittelpunkt.
export function drawRichLine(
  ctx: CanvasRenderingContext2D,
  line: RichTok[],
  x: number,
  y: number,
  baseColor: string,
  accent: string,
  align: 'left' | 'center' = 'left',
) {
  const spaceW = ctx.measureText(' ').width
  let cx = align === 'center' ? x - richLineWidth(ctx, line) / 2 : x
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  line.forEach((t, i) => {
    if (i > 0 && t.spaceBefore) cx += spaceW
    ctx.fillStyle = t.hl ? accent : baseColor
    ctx.fillText(t.text, cx, y)
    cx += ctx.measureText(t.text).width
  })
  ctx.textAlign = prevAlign
}

function kicker(ctx: CanvasRenderingContext2D, text: string, p: Palette, x: number, y: number) {
  ctx.font = `600 30px ${FONT}`
  ctx.fillStyle = p.muted
  try {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '7px'
  } catch { /* Safari < 17 */ }
  ctx.fillText(text.toUpperCase(), x, y)
  try {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  } catch { /* noop */ }
}

function footer(ctx: CanvasRenderingContext2D, p: Palette, w: number, h: number) {
  ctx.strokeStyle = p.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, h - PAD - 58)
  ctx.lineTo(w - PAD, h - PAD - 58)
  ctx.stroke()

  ctx.font = `700 34px ${FONT}`
  ctx.fillStyle = p.fg
  ctx.fillText('MY GYM TRACK', PAD, h - PAD)

  ctx.font = `400 30px ${FONT}`
  ctx.fillStyle = p.muted
  ctx.textAlign = 'right'
  ctx.fillText('@mygymtrack', w - PAD, h - PAD)
  ctx.textAlign = 'left'
}

export interface PostDrawSpec {
  kickerText: string
  headline: string
  sub: string
  theme: PostTheme
  w: number
  h: number
  pageIndicator?: string
  vAlign?: 'top' | 'center' | 'bottom'
  accent?: string
}

export function drawPost(canvas: HTMLCanvasElement, spec: PostDrawSpec) {
  const p = PALETTES[spec.theme]
  const accent = spec.accent ?? DEFAULT_ACCENT
  const ctx = ctx2d(canvas, spec.w, spec.h)
  const contentW = spec.w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, spec.w, spec.h)

  kicker(ctx, spec.kickerText, p, PAD, PAD + 30)

  if (spec.pageIndicator) {
    ctx.font = `500 30px ${FONT}`
    ctx.fillStyle = p.muted
    ctx.textAlign = 'right'
    ctx.fillText(spec.pageIndicator, spec.w - PAD, PAD + 30)
    ctx.textAlign = 'left'
  }

  const head = richFit(ctx, spec.headline, contentW, spec.h > 1500 ? 104 : 92, 56, 5, 700)
  const headLH = head.size * 1.12
  const subFit = richFit(ctx, spec.sub, contentW, 42, 32, 5, 400)
  const subLH = subFit.size * 1.42
  const gap = 56
  const blockH = head.lines.length * headLH + gap + subFit.lines.length * subLH
  let y: number
  if (spec.vAlign === 'top') y = PAD + 190 + head.size * 0.8
  else if (spec.vAlign === 'bottom') y = spec.h - PAD - 190 - blockH + head.size * 0.8
  else y = (spec.h - blockH) / 2 + head.size * 0.8

  ctx.font = `700 ${head.size}px ${FONT}`
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += headLH
  }

  y += gap - headLH + subLH
  ctx.font = `400 ${subFit.size}px ${FONT}`
  for (const line of subFit.lines) {
    drawRichLine(ctx, line, PAD, y, p.muted, accent)
    y += subLH
  }

  footer(ctx, p, spec.w, spec.h)
}

export function drawSlide(canvas: HTMLCanvasElement, slide: Slide, theme: PostTheme, kickerText: string, h = 1350, accent = DEFAULT_ACCENT) {
  const p = PALETTES[theme]
  const w = 1080
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  kicker(ctx, kickerText, p, PAD, PAD + 30)

  if (slide.kind === 'point') {
    // grosse dezente Slide-Nummer
    ctx.font = `700 200px ${FONT}`
    ctx.fillStyle = p.line
    ctx.fillText(String(slide.index - 1).padStart(2, '0'), PAD - 8, 420)
  }

  const headBase = slide.kind === 'cover' ? 96 : 76
  const head = richFit(ctx, slide.heading, contentW, headBase, 48, 5, 700)
  const headLH = head.size * 1.12
  const bodyFit = slide.body ? richFit(ctx, slide.body, contentW, 42, 32, 5, 400) : null
  const bodyLH = bodyFit ? bodyFit.size * 1.42 : 0
  const gap = slide.body ? 52 : 0
  const blockH = head.lines.length * headLH + gap + (bodyFit ? bodyFit.lines.length * bodyLH : 0)
  let y = slide.kind === 'point' ? Math.round(h * 0.415) : (h - blockH) / 2 + head.size * 0.8

  ctx.font = `700 ${head.size}px ${FONT}`
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += headLH
  }

  if (bodyFit) {
    y += gap - headLH + bodyLH
    ctx.font = `400 ${bodyFit.size}px ${FONT}`
    for (const line of bodyFit.lines) {
      drawRichLine(ctx, line, PAD, y, p.muted, accent)
      y += bodyLH
    }
  }

  footer(ctx, p, w, h)
}

export interface MockupSpec {
  img: HTMLImageElement
  headline: string
  sub: string
  theme: PostTheme
  w?: number
  h?: number
  kickerText?: string
  accent?: string
}

export function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Apple-artige App-Praesentation: Screenshot in iPhone-Rahmen auf ruhigem Grund
export function drawMockup(canvas: HTMLCanvasElement, spec: MockupSpec) {
  const w = spec.w ?? 1080
  const h = spec.h ?? 1350
  const p = PALETTES[spec.theme]
  const accent = spec.accent ?? DEFAULT_ACCENT
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  kicker(ctx, spec.kickerText ?? 'MY GYM TRACK', p, PAD, PAD + 30)

  const head = richFit(ctx, spec.headline, contentW, 76, 48, 2, 700)
  let y = PAD + 130
  ctx.font = `700 ${head.size}px ${FONT}`
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += head.size * 1.12
  }

  const subFit = richFit(ctx, spec.sub, contentW, 40, 30, 2, 400)
  y += 16
  ctx.font = `400 ${subFit.size}px ${FONT}`
  for (const line of subFit.lines) {
    drawRichLine(ctx, line, PAD, y, p.muted, accent)
    y += subFit.size * 1.4
  }

  // Geraet: unterer Bereich, ragt bewusst aus dem Frame (Apple-Marketing-Stil)
  const deviceTop = y + 60
  const deviceH = h - deviceTop + 120 // unten angeschnitten
  const ratio = spec.img.width / spec.img.height
  const screenW = Math.min(620, deviceH * ratio * 0.96)
  const bezel = 16
  const deviceW = screenW + bezel * 2
  const dx = (w - deviceW) / 2
  const dy = deviceTop

  // Schatten
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 90
  ctx.shadowOffsetY = 30
  ctx.fillStyle = spec.theme === 'dark' ? '#1C1C1E' : '#111111'
  roundedPath(ctx, dx, dy, deviceW, deviceH, 92)
  ctx.fill()
  ctx.restore()

  // Screen (Screenshot, cover-fit, geclippt) — Rahmen ersetzt Hintergrund-Entfernung
  const sx = dx + bezel
  const sy = dy + bezel
  const sw = deviceW - bezel * 2
  const sh = deviceH - bezel * 2
  ctx.save()
  roundedPath(ctx, sx, sy, sw, sh, 76)
  ctx.clip()
  const scale = Math.max(sw / spec.img.width, sh / spec.img.height)
  const iw = spec.img.width * scale
  const ih = spec.img.height * scale
  ctx.drawImage(spec.img, sx + (sw - iw) / 2, sy, iw, ih)
  ctx.restore()

  footer(ctx, p, w, h)
}

// TikTok Photo-Slide: 9:16, riesiger zentrierter Text, respektiert manuelle \n-Umbrueche.
// Bewusst clean: keine Meta-Labels im Bild (kein "TIKTOK", keine Kartennummer, kein
// Sound) — nur Hook + dezente Brand-Signatur, damit das PNG direkt postbar ist.
export function drawTikTokSlide(
  canvas: HTMLCanvasElement,
  text: string,
  theme: PostTheme,
  vAlign: 'top' | 'center' | 'bottom' = 'center',
  accent = DEFAULT_ACCENT,
) {
  const w = 1080
  const h = 1920
  const p = PALETTES[theme]
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  // manuelle Zeilen (mit Highlight-Segmenten); groesste Schrift finden, bei der
  // die breiteste Zeile passt. Markup faerbt Passagen, misst aber ohne Sternchen.
  const rawLines = text.split('\n')
  const richLines = rawLines.map(l => tokenizeRich(l))
  let size = 132
  for (; size >= 60; size -= 4) {
    ctx.font = `700 ${size}px ${FONT}`
    const widest = Math.max(0, ...richLines.map(l => richLineWidth(ctx, l)))
    const totalH = rawLines.length * size * 1.16
    if (widest <= contentW && totalH <= h - 460) break
  }
  const lh = size * 1.16
  const blockH = rawLines.length * lh
  let y: number
  if (vAlign === 'top') y = 300 + size * 0.78
  else if (vAlign === 'bottom') y = h - 300 - blockH + size * 0.78
  else y = (h - blockH) / 2 + size * 0.78

  ctx.font = `700 ${size}px ${FONT}`
  for (const line of richLines) {
    if (line.length) drawRichLine(ctx, line, w / 2, y, p.fg, accent, 'center')
    y += lh
  }

  // dezente Brand-Signatur unten mittig (kein Sound, kein Label)
  ctx.font = `700 34px ${FONT}`
  ctx.fillStyle = p.muted
  ctx.textAlign = 'center'
  ctx.fillText('MY GYM TRACK', w / 2, h - PAD)
  ctx.textAlign = 'left'
}

// TikTok Screenshot-Slide: Hook oben, kompletter App-Screenshot im Phone-Frame
// darunter — zum Praesentieren der App. Clean, keine Meta-Labels.
export function drawTikTokShot(canvas: HTMLCanvasElement, img: HTMLImageElement, headline: string, theme: PostTheme, accent = DEFAULT_ACCENT) {
  const w = 1080
  const h = 1920
  const p = PALETTES[theme]
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  const head = richFit(ctx, headline, contentW, 82, 50, 3, 700)
  let y = PAD + 150
  ctx.font = `700 ${head.size}px ${FONT}`
  for (const line of head.lines) {
    drawRichLine(ctx, line, w / 2, y, p.fg, accent, 'center')
    y += head.size * 1.14
  }

  // Geraet: vollstaendig sichtbar (nicht angeschnitten), zwischen Headline und Brand
  const deviceTop = y + 56
  const bottomReserve = 150
  const deviceH = h - deviceTop - bottomReserve
  const bezel = 16
  const ratio = img.width / img.height
  let screenW = deviceH * ratio
  if (screenW + bezel * 2 > contentW) screenW = contentW - bezel * 2
  const deviceW = screenW + bezel * 2
  const dx = (w - deviceW) / 2
  const dy = deviceTop

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 90
  ctx.shadowOffsetY = 30
  ctx.fillStyle = theme === 'dark' ? '#1C1C1E' : '#111111'
  roundedPath(ctx, dx, dy, deviceW, deviceH, 92)
  ctx.fill()
  ctx.restore()

  const sx = dx + bezel
  const sy = dy + bezel
  const sw = deviceW - bezel * 2
  const sh = deviceH - bezel * 2
  ctx.save()
  roundedPath(ctx, sx, sy, sw, sh, 76)
  ctx.clip()
  const scale = Math.max(sw / img.width, sh / img.height)
  const iw = img.width * scale
  const ih = img.height * scale
  ctx.drawImage(img, sx + (sw - iw) / 2, sy + (sh - ih) / 2, iw, ih)
  ctx.restore()

  ctx.font = `700 34px ${FONT}`
  ctx.fillStyle = p.muted
  ctx.textAlign = 'center'
  ctx.fillText('MY GYM TRACK', w / 2, h - PAD)
  ctx.textAlign = 'left'
}

export function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name.endsWith('.png') ? name : name + '.png'
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export function canvasThumb(canvas: HTMLCanvasElement, maxW = 200): string {
  const scale = maxW / canvas.width
  const tmp = document.createElement('canvas')
  tmp.width = maxW
  tmp.height = Math.round(canvas.height * scale)
  tmp.getContext('2d')!.drawImage(canvas, 0, 0, tmp.width, tmp.height)
  return tmp.toDataURL('image/jpeg', 0.7)
}
