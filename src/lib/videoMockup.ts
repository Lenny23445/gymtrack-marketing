import type { PostTheme } from './types'
import type { TextStyle } from './fonts'
import { FONT_STACKS } from './fonts'
import { PALETTES, richFit, drawRichLine, roundedPath, setDrawStyle, mainFont, DEFAULT_ACCENT } from './canvas'

// Video-Mockup: App-Screen-Recording laeuft im iPhone-Rahmen auf ruhigem
// Studio-Hintergrund. Preview via rAF, Export via captureStream + MediaRecorder.

const FONT = FONT_STACKS.sans // Brand-Signatur bleibt Sans
const PAD = 96

export interface VideoFrameOpts {
  video: HTMLVideoElement
  theme: PostTheme
  w: number
  h: number
  headline: string
  sub: string
  accent?: string
  style?: TextStyle
}

export function drawVideoFrame(ctx: CanvasRenderingContext2D, o: VideoFrameOpts) {
  const p = PALETTES[o.theme]
  const accent = o.accent ?? DEFAULT_ACCENT
  setDrawStyle(o.style, o.theme)
  const { w, h } = o
  const contentW = w - PAD * 2

  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)

  // Headline + Subline zentriert oben (Markup *…* faerbt Passagen)
  const head = richFit(ctx, o.headline, contentW, h > 1500 ? 80 : 72, 44, 2, 700)
  let y = PAD + 60 + head.size * 0.8
  ctx.font = mainFont(700, head.size)
  for (const line of head.lines) {
    drawRichLine(ctx, line, w / 2, y, p.fg, accent, 'center')
    y += head.size * 1.12
  }
  const subFit = richFit(ctx, o.sub, contentW, 38, 28, 2, 400)
  y += 10
  ctx.font = mainFont(400, subFit.size)
  for (const line of subFit.lines) {
    drawRichLine(ctx, line, w / 2, y, p.muted, accent, 'center')
    y += subFit.size * 1.4
  }

  // Geraet: komplett sichtbar zwischen Text und Brand-Zeile
  const vw = o.video.videoWidth || 390
  const vh = o.video.videoHeight || 844
  const ratio = vw / vh
  const bezel = 16
  const deviceTop = y + 44
  const bottomReserve = 130
  const deviceH = h - deviceTop - bottomReserve
  let screenW = deviceH * ratio
  if (screenW + bezel * 2 > contentW) screenW = contentW - bezel * 2
  const deviceW = screenW + bezel * 2
  const dx = (w - deviceW) / 2
  const dy = deviceTop

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 90
  ctx.shadowOffsetY = 30
  ctx.fillStyle = o.theme === 'dark' ? '#1C1C1E' : '#111111'
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
  const scale = Math.max(sw / vw, sh / vh)
  ctx.drawImage(o.video, sx + (sw - vw * scale) / 2, sy + (sh - vh * scale) / 2, vw * scale, vh * scale)
  ctx.restore()

  ctx.font = `700 32px ${FONT}`
  ctx.fillStyle = p.muted
  ctx.textAlign = 'center'
  ctx.fillText('MY GYM TRACK', w / 2, h - 64)
  ctx.textAlign = 'left'
}

function pickMime(): string {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch { /* aeltere Browser */ }
  }
  return 'video/webm'
}

export async function recordVideoMockup(
  o: VideoFrameOpts,
  onProgress?: (pct: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = o.w
  canvas.height = o.h
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(30)
  const mime = pickMime()
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>(res => { rec.onstop = () => res() })

  const v = o.video
  const wasLoop = v.loop
  v.loop = false
  v.muted = true
  v.currentTime = 0
  await v.play()
  rec.start(250)

  await new Promise<void>(resolve => {
    const loop = () => {
      drawVideoFrame(ctx, o)
      onProgress?.(Math.min(1, v.currentTime / (v.duration || 1)))
      if (v.ended) {
        drawVideoFrame(ctx, o)
        resolve()
        return
      }
      requestAnimationFrame(loop)
    }
    loop()
  })

  rec.stop()
  await stopped
  v.loop = wasLoop
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
