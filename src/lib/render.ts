import { CATEGORY_META } from './types'
import type { IgPayload, MockupPayload, SavedPost, TiktokPayload } from './savedPosts'
import {
  drawMockup,
  drawPost,
  drawSlide,
  drawTikTokShot,
  drawTikTokSlide,
  drawStickers,
  downloadCanvas,
  canvasThumb,
} from './canvas'
import { loadShotImage } from './screenshots'

// Rendert einen gespeicherten Post aus seinem Payload komplett neu — spiegelt die
// Zeichenlogik der jeweiligen Generator-Seite, damit PNG-Download und Thumbnail
// direkt aus der Datenbank funktionieren, ohne den Post vorher öffnen zu müssen.

function postHeight(format: IgPayload['format'], aspect: IgPayload['aspect']): number {
  return format === 'story' ? 1920 : aspect === '11' ? 1080 : 1350
}

async function renderIg(d: IgPayload): Promise<HTMLCanvasElement[]> {
  const h = postHeight(d.format, d.aspect)
  const kicker = CATEGORY_META[d.post.category].kicker
  const out: HTMLCanvasElement[] = []

  const style = d.style

  if (d.format === 'carousel' && d.post.slides) {
    const img = await loadShotImage(d.shotId)
    for (const s of d.post.slides) {
      const c = document.createElement('canvas')
      if ((s.withShot || s.kind === 'shot') && img) {
        drawMockup(c, { img, headline: s.heading, sub: s.body ?? '', theme: d.theme, w: 1080, h, kickerText: kicker, accent: d.accent, style })
      } else {
        drawSlide(c, s, d.theme, kicker, h, d.accent, style)
      }
      out.push(c)
    }
    return out
  }

  const c = document.createElement('canvas')
  const img = d.visual !== 'typo' ? await loadShotImage(d.shotId) : null
  if (img) {
    drawMockup(c, {
      img,
      headline: d.visual === 'promo' ? d.post.cta : d.post.headline,
      sub: d.visual === 'promo' ? d.post.headline : d.post.sub,
      theme: d.theme,
      w: 1080,
      h,
      kickerText: kicker,
      accent: d.accent,
      style,
    })
  } else {
    drawPost(c, { kickerText: kicker, headline: d.post.headline, sub: d.post.sub, theme: d.theme, w: 1080, h, vAlign: d.vAlign, accent: d.accent, style })
  }
  out.push(c)
  return out
}

async function renderTikTok(d: TiktokPayload): Promise<HTMLCanvasElement[]> {
  const out: HTMLCanvasElement[] = []
  for (const s of d.concept.slides) {
    const c = document.createElement('canvas')
    const img = s.kind === 'shot' ? await loadShotImage(s.shotId) : null
    if (s.kind === 'shot' && img) drawTikTokShot(c, img, s.text, d.theme, d.accent, d.style)
    else drawTikTokSlide(c, s.text, d.theme, s.align ?? 'center', d.accent, d.style)
    await drawStickers(c, s.stickers)
    out.push(c)
  }
  return out
}

async function renderMockup(d: MockupPayload): Promise<HTMLCanvasElement[]> {
  const c = document.createElement('canvas')
  const img = await loadShotImage(d.shotId)
  if (img) {
    drawMockup(c, { img, headline: d.headline, sub: d.sub, theme: d.theme, accent: d.accent, style: d.style })
  } else {
    drawPost(c, { kickerText: 'MY GYM TRACK', headline: d.headline, sub: d.sub, theme: d.theme, w: 1080, h: 1350, accent: d.accent, style: d.style })
  }
  return [c]
}

export async function renderSaved(saved: SavedPost): Promise<HTMLCanvasElement[]> {
  const p = saved.payload
  if (p.kind === 'ig') return renderIg(p.data)
  if (p.kind === 'tiktok') return renderTikTok(p.data)
  return renderMockup(p.data)
}

function slugish(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
}

// Lädt alle Slides/Seiten eines gespeicherten Posts als PNG herunter.
export async function downloadSaved(saved: SavedPost): Promise<void> {
  const canvases = await renderSaved(saved)
  const base = slugish(saved.title) || saved.kind
  canvases.forEach((c, i) => {
    setTimeout(() => downloadCanvas(c, canvases.length > 1 ? `${base}-slide-${i + 1}` : base), i * 300)
  })
}

// Frisches Thumbnail aus dem Payload (Fallback, falls beim Speichern keins mitkam).
export async function thumbForSaved(saved: SavedPost): Promise<string | undefined> {
  const canvases = await renderSaved(saved)
  return canvases[0] ? canvasThumb(canvases[0]) : undefined
}
