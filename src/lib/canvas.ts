import type { PostTheme, Slide, Sticker, SlideBg, VAlign } from './types'
import { FONT_STACKS, DEFAULT_STYLE, HEAD_WEIGHT } from './fonts'
import type { TextStyle, EffectKey } from './fonts'
import { parseRich, stripRich } from './richtext'

// stripRich wird von hier re-exportiert (Aufrufer importieren es weiterhin aus canvas).
export { stripRich }

// Rendering-Engine: zeichnet Posts in Instagram-Aufloesung (1080er) auf Canvas.
// Design-Sprache: Apple-like — viel Weissraum, klare Typo, schwarz/weiss.

// Brand/Kicker/Footer bleiben immer in dieser System-Sans (Marken-Konstante).
const FONT = FONT_STACKS.sans

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

// ── Aktiver Schrift-/Effekt-Stil ────────────────────────────────────────────
// Modul-State, den jede oeffentliche draw-Funktion GANZ OBEN aus ihrem style-
// Parameter setzt. Alle draw-Funktionen laufen synchron durch (kein await
// dazwischen) — der Stil wird beim Betreten frisch gesetzt und bis zum Ende nicht
// gestoert, daher auch bei parallelen Aufrufern (Thumbnails) rennfrei.
let CUR_FAM: string = FONT_STACKS.sans
let CUR_EFFECT: EffectKey = 'none'
let CUR_STROKE = '#0A0A0A' // Konturfarbe = Hintergrund (fuer Kontur/Sticker)
let CUR_HEAD_WEIGHT = 700 // Kopf-/Headline-Gewicht der aktiven Familie

export function setDrawStyle(style: TextStyle | undefined, theme: PostTheme) {
  const s = style ?? DEFAULT_STYLE
  CUR_FAM = FONT_STACKS[s.font] ?? FONT_STACKS.sans
  CUR_HEAD_WEIGHT = HEAD_WEIGHT[s.font] ?? 700
  CUR_EFFECT = s.effect ?? 'none'
  CUR_STROKE = PALETTES[theme].bg
}

// Font-String fuer den HAUPT-Text (Headline/Body/Hook). Headline-Aufrufe kommen mit
// weight>=700 → dann bestimmt die Familie ihr eigenes Kopf-Gewicht (z.B. Montserrat
// 800 fuer den fetten TikTok-Look). Body-Text (weight 400) bleibt unveraendert.
export function mainFont(weight: number, size: number): string {
  const w = weight >= 700 ? CUR_HEAD_WEIGHT : weight
  return `${w} ${size}px ${CUR_FAM}`
}

// Aktuelle Pixel-Groesse aus ctx.font lesen (fuer effektabhaengige Linienbreiten).
function fontSize(ctx: CanvasRenderingContext2D): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font)
  return m ? parseFloat(m[1]) : 48
}

// Zeichnet EIN Text-Stueck mit dem aktiven Effekt an (x,y). ctx.font vorher setzen.
// Wird von drawRichLine fuer allen Haupt-Text genutzt (Kicker/Footer/Brand nicht).
function paintText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  const eff = CUR_EFFECT
  if (eff === 'none') {
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    return
  }
  const size = fontSize(ctx)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  if (eff === 'shadow') {
    ctx.shadowColor = 'rgba(0,0,0,0.40)'
    ctx.shadowBlur = size * 0.10
    ctx.shadowOffsetY = Math.max(2, size * 0.06)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  } else if (eff === 'glow') {
    // Neon: farbiger Schein in der Textfarbe, mehrfach fuer Intensitaet
    ctx.shadowColor = color
    ctx.shadowBlur = size * 0.5
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    ctx.fillText(text, x, y)
    ctx.shadowBlur = 0
    ctx.fillText(text, x, y)
  } else if (eff === 'outline') {
    // Kontur: kontrastierende Umrandung + normale Fuellung (pop auf jedem Grund)
    ctx.strokeStyle = CUR_STROKE
    ctx.lineWidth = Math.max(2, size * 0.11)
    ctx.strokeText(text, x, y)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  } else if (eff === 'sticker') {
    // Sticker/Bubble: dicke Umrandung + weicher Schatten (TikTok-Caption-Look)
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = size * 0.10
    ctx.shadowOffsetY = Math.max(2, size * 0.05)
    ctx.strokeStyle = CUR_STROKE
    ctx.lineWidth = Math.max(3, size * 0.22)
    ctx.strokeText(text, x, y)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  } else if (eff === 'lift') {
    // 3D: gestapelte Versatz-Kopien in Dunkel hinter dem Text
    const depth = Math.max(3, Math.round(size * 0.06))
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    for (let d = depth; d >= 1; d--) ctx.fillText(text, x + d, y + d)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }
  ctx.restore()
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
    ctx.font = mainFont(weight, size)
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = mainFont(weight, min)
  return { size: min, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) }
}

// ── Rich-Text: Inline-Markup *so* faerbt einzelne Passagen in einer Akzentfarbe ──
// Genutzt in allen Render-Pfaden (Post, Slide, Mockup, TikTok, Video). Marketing
// schreibt z.B. "Logge Saetze in *Sekunden*" — "Sekunden" wird dann farbig gerendert.

export const DEFAULT_ACCENT = '#0A84FF'

export interface RichTok { text: string; hl: boolean; color?: string; spaceBefore: boolean }

// In Wort-Tokens mit Highlight-Flag/Farbe zerlegen (Highlight auf Wortgrenzen).
// parseRich (aus richtext.ts) liefert Segmente mit optionaler Farbe bzw. Legacy-hl.
export function tokenizeRich(raw: string): RichTok[] {
  const toks: RichTok[] = []
  let pendingSpace = false
  let started = false
  for (const seg of parseRich(raw)) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (part === '') continue
      if (/^\s+$/.test(part)) { pendingSpace = true; continue }
      toks.push({ text: part, hl: !!seg.hl, color: seg.color, spaceBefore: started && pendingSpace })
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
    ctx.font = mainFont(weight, size)
    const lines = richWrap(ctx, toks, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = mainFont(weight, min)
  return { size: min, lines: richWrap(ctx, toks, maxWidth).slice(0, maxLines) }
}

// Zeichnet eine Zeile mit Highlight-Segmenten und dem aktiven Effekt. Font vorher setzen.
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
    paintText(ctx, t.text, cx, y, t.color ?? (t.hl ? accent : baseColor))
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
  style?: TextStyle
}

export function drawPost(canvas: HTMLCanvasElement, spec: PostDrawSpec) {
  const p = PALETTES[spec.theme]
  const accent = spec.accent ?? DEFAULT_ACCENT
  setDrawStyle(spec.style, spec.theme)
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

  ctx.font = mainFont(700, head.size)
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += headLH
  }

  y += gap - headLH + subLH
  ctx.font = mainFont(400, subFit.size)
  for (const line of subFit.lines) {
    drawRichLine(ctx, line, PAD, y, p.muted, accent)
    y += subLH
  }

  footer(ctx, p, spec.w, spec.h)
}

export function drawSlide(
  canvas: HTMLCanvasElement,
  slide: Slide,
  theme: PostTheme,
  kickerText: string,
  h = 1350,
  accent = DEFAULT_ACCENT,
  style?: TextStyle,
) {
  const p = PALETTES[theme]
  setDrawStyle(style, theme)
  const w = 1080
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  kicker(ctx, kickerText, p, PAD, PAD + 30)

  if (slide.kind === 'point') {
    // grosse dezente Slide-Nummer (immer Sans, dekorativ)
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

  ctx.font = mainFont(700, head.size)
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += headLH
  }

  if (bodyFit) {
    y += gap - headLH + bodyLH
    ctx.font = mainFont(400, bodyFit.size)
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
  style?: TextStyle
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
  setDrawStyle(spec.style, spec.theme)
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  kicker(ctx, spec.kickerText ?? 'MY GYM TRACK', p, PAD, PAD + 30)

  const head = richFit(ctx, spec.headline, contentW, 76, 48, 2, 700)
  let y = PAD + 130
  ctx.font = mainFont(700, head.size)
  for (const line of head.lines) {
    drawRichLine(ctx, line, PAD, y, p.fg, accent)
    y += head.size * 1.12
  }

  const subFit = richFit(ctx, spec.sub, contentW, 40, 30, 2, 400)
  y += 16
  ctx.font = mainFont(400, subFit.size)
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

// Hintergrund eines Slides zeichnen: Theme, Vollton, Farbverlauf oder eigenes Bild.
// bgImg = vorab geladenes Bild (für type 'image'), da das Zeichnen synchron ist.
export function paintBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: PostTheme,
  bg?: SlideBg,
  bgImg?: HTMLImageElement | null,
) {
  const p = PALETTES[theme]
  if (!bg || bg.type === 'theme') {
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, w, h)
  } else if (bg.type === 'solid') {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, w, h)
  } else if (bg.type === 'gradient') {
    const a = ((bg.angle ?? 135) * Math.PI) / 180
    const r = Math.hypot(w, h) / 2
    const cx = w / 2
    const cy = h / 2
    const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    // Misch-Punkt (mid): verschiebt, wo sich beide Farben zu 50/50 treffen (Default Mitte).
    const mid = Math.max(0.02, Math.min(0.98, bg.mid ?? 0.5))
    if (mid <= 0.5) {
      g.addColorStop(0, bg.from)
      g.addColorStop(Math.min(1, mid * 2), bg.to)
    } else {
      g.addColorStop(Math.max(0, mid * 2 - 1), bg.from)
      g.addColorStop(1, bg.to)
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, w, h)
    if (bgImg) {
      const scale = Math.max(w / bgImg.width, h / bgImg.height)
      const iw = bgImg.width * scale
      const ih = bgImg.height * scale
      ctx.drawImage(bgImg, (w - iw) / 2, (h - ih) / 2, iw, ih)
    }
  }
}

export interface TextRect {
  nx: number
  ny: number
  nw: number
  nh: number
}

// TikTok Photo-Slide: 9:16, riesiger Text (frei positionierbar), respektiert manuelle
// \n-Umbrueche. Liefert das Text-Rechteck (normalisiert) für den Verschiebe-Griff zurück.
export function drawTikTokSlide(
  canvas: HTMLCanvasElement,
  text: string,
  theme: PostTheme,
  vAlign: VAlign = 'center',
  accent = DEFAULT_ACCENT,
  style?: TextStyle,
  bg?: SlideBg,
  pos?: { tx?: number; ty?: number },
  bgImg?: HTMLImageElement | null,
): TextRect {
  const w = 1080
  const h = 1920
  const p = PALETTES[theme]
  setDrawStyle(style, theme)
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  paintBg(ctx, w, h, theme, bg, bgImg)

  // manuelle Zeilen (mit Highlight-Segmenten); groesste Schrift finden, bei der
  // die breiteste Zeile passt. Markup faerbt Passagen, misst aber ohne Sternchen.
  const rawLines = text.split('\n')
  const richLines = rawLines.map(l => tokenizeRich(l))
  let size = 132
  for (; size >= 60; size -= 4) {
    ctx.font = mainFont(700, size)
    const widest = Math.max(0, ...richLines.map(l => richLineWidth(ctx, l)))
    const totalH = rawLines.length * size * 1.16
    if (widest <= contentW && totalH <= h - 460) break
  }
  ctx.font = mainFont(700, size)
  const widest = Math.max(0, ...richLines.map(l => richLineWidth(ctx, l)))
  const lh = size * 1.16
  const blockH = rawLines.length * lh
  const cx = pos?.tx != null ? pos.tx * w : w / 2

  // Baseline der ersten Zeile
  let y: number
  if (pos?.ty != null) y = pos.ty * h - blockH / 2 + size * 0.78
  else if (vAlign === 'top') y = 300 + size * 0.78
  else if (vAlign === 'bottom') y = h - 300 - blockH + size * 0.78
  else y = (h - blockH) / 2 + size * 0.78

  const blockTop = y - size * 0.78
  ctx.font = mainFont(700, size)
  for (const line of richLines) {
    if (line.length) drawRichLine(ctx, line, cx, y, p.fg, accent, 'center')
    y += lh
  }

  // dezente Brand-Signatur unten mittig (immer Sans, kein Effekt)
  ctx.font = `700 34px ${FONT}`
  ctx.fillStyle = p.muted
  ctx.textAlign = 'center'
  ctx.fillText('MY GYM TRACK', w / 2, h - PAD)
  ctx.textAlign = 'left'

  return {
    nx: cx / w,
    ny: (blockTop + blockH / 2) / h,
    nw: Math.min(1, (widest + 40) / w),
    nh: (blockH + 20) / h,
  }
}

// TikTok Screenshot-Slide: Hook oben, kompletter App-Screenshot im Phone-Frame
// darunter — zum Praesentieren der App. Clean, keine Meta-Labels.
export function drawTikTokShot(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  headline: string,
  theme: PostTheme,
  accent = DEFAULT_ACCENT,
  style?: TextStyle,
  bg?: SlideBg,
  bgImg?: HTMLImageElement | null,
) {
  const w = 1080
  const h = 1920
  const p = PALETTES[theme]
  setDrawStyle(style, theme)
  const ctx = ctx2d(canvas, w, h)
  const contentW = w - PAD * 2

  paintBg(ctx, w, h, theme, bg, bgImg)

  const head = richFit(ctx, headline, contentW, 82, 50, 3, 700)
  let y = PAD + 150
  ctx.font = mainFont(700, head.size)
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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('sticker load'))
    i.src = src
  })
}

// Frei platzierte Sticker in das (bereits gezeichnete) Canvas einbrennen — für den
// PNG-Export und DB-Thumbnails. Positionen sind Anteile der Canvas-Maße (0..1).
export async function drawStickers(canvas: HTMLCanvasElement, stickers?: Sticker[]) {
  if (!stickers || stickers.length === 0) return
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  for (const s of stickers) {
    try {
      const img = await loadImg(s.dataUrl)
      const w = Math.max(1, s.nscale * W)
      const h = w * (img.height / Math.max(1, img.width))
      ctx.drawImage(img, s.nx * W - w / 2, s.ny * H - h / 2, w, h)
    } catch {
      /* kaputten Sticker überspringen */
    }
  }
}

// Sticker beim Import verkleinern, aber als PNG (Transparenz bleibt erhalten —
// JPEG würde durchsichtige Bereiche schwarz füllen).
export function downscalePng(dataUrl: string, maxDim = 700): Promise<string> {
  return loadImg(dataUrl)
    .then(img => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      return c.toDataURL('image/png')
    })
    .catch(() => dataUrl)
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
