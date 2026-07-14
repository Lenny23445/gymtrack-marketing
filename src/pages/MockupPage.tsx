import { useEffect, useRef, useState } from 'react'
import type { PostTheme } from '../lib/types'
import { drawMockup, downloadCanvas, canvasThumb } from '../lib/canvas'
import { drawVideoFrame, recordVideoMockup, downloadBlob } from '../lib/videoMockup'
import { generateHashtags } from '../data/hashtags'
import { CTAS } from '../data/ideas'
import { hashtagBlock } from '../lib/generator'
import { addPlanned } from '../lib/store'
import { CopyButton, Seg } from '../components/ui'
import { ScreenshotPicker } from '../components/ScreenshotPicker'

interface TextIdea { h: string; s: string }

const TYPES: { id: string; label: string; texts: TextIdea[] }[] = [
  { id: 'overview', label: 'Trainingsübersicht', texts: [
    { h: 'Alle deine Workouts an einem Ort', s: 'Nie wieder vergessen, was du trainiert hast.' },
    { h: 'Dein Training. Ein Blick.', s: 'Die Übersicht, die dein Notizzettel nie sein konnte.' },
  ]},
  { id: 'log', label: 'Workout-Log', texts: [
    { h: 'Logge Sätze in Sekunden', s: 'Gewicht, Wiederholungen, fertig — weitertrainieren.' },
    { h: 'Schneller als jeder Zettel', s: 'Dein Log wartet schon auf den nächsten Satz.' },
  ]},
  { id: 'stats', label: 'Statistiken', texts: [
    { h: 'Dein Fortschritt als Graph', s: 'Jede Steigerung, schwarz auf weiß.' },
    { h: 'Zahlen, die dich weiterbringen', s: 'Volumen, Rekorde und Trends auf einen Blick.' },
  ]},
  { id: 'history', label: 'Trainingshistorie', texts: [
    { h: 'Scroll zurück zu Tag 1', s: 'Deine komplette Trainingsgeschichte, immer dabei.' },
    { h: 'Jedes Workout zählt', s: 'Und jedes einzelne ist gespeichert.' },
  ]},
  { id: 'recovery', label: 'Erholungsanalyse', texts: [
    { h: 'Erholung im Blick', s: 'Trainiere, wenn dein Körper bereit ist.' },
    { h: 'Wachstum passiert in der Pause', s: 'Sieh, welche Muskeln Regeneration brauchen.' },
  ]},
]

type Mode = 'image' | 'video'
type VidFormat = 'post' | 'reel'

export default function MockupPage() {
  const [mode, setMode] = useState<Mode>('image')
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [pickId, setPickId] = useState<string | null>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [videoName, setVideoName] = useState('')
  const [vidFormat, setVidFormat] = useState<VidFormat>('reel')
  const [rendering, setRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [typeId, setTypeId] = useState('overview')
  const [textIdx, setTextIdx] = useState(0)
  const [headline, setHeadline] = useState(TYPES[0].texts[0].h)
  const [sub, setSub] = useState(TYPES[0].texts[0].s)
  const [theme, setTheme] = useState<PostTheme>('dark')
  const [saved, setSaved] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  const applyType = (id: string, idx: number) => {
    const t = TYPES.find(x => x.id === id)!
    const text = t.texts[idx % t.texts.length]
    setTypeId(id)
    setTextIdx(idx % t.texts.length)
    setHeadline(text.h)
    setSub(text.s)
  }

  // Bild-Vorschau
  useEffect(() => {
    if (mode !== 'image' || !img || !canvasRef.current) return
    drawMockup(canvasRef.current, { img, headline, sub, theme })
  }, [mode, img, headline, sub, theme])

  // Video-Vorschau: laufender rAF-Loop
  useEffect(() => {
    if (mode !== 'video' || !video || !canvasRef.current) return
    const c = canvasRef.current
    const w = 1080
    const h = vidFormat === 'reel' ? 1920 : 1350
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    video.loop = true
    video.muted = true
    video.play().catch(() => {})
    const loop = () => {
      if (!rendering) drawVideoFrame(ctx, { video, theme, w, h, headline, sub })
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(rafRef.current)
  }, [mode, video, vidFormat, theme, headline, sub, rendering])

  const onVideoFile = (file: File | undefined) => {
    if (!file) return
    const v = document.createElement('video')
    v.src = URL.createObjectURL(file)
    v.playsInline = true
    v.muted = true
    v.onloadedmetadata = () => {
      setVideo(v)
      setVideoName(file.name)
    }
  }

  const exportVideo = async () => {
    if (!video || rendering) return
    setRendering(true)
    setProgress(0)
    try {
      const w = 1080
      const h = vidFormat === 'reel' ? 1920 : 1350
      const { blob, ext } = await recordVideoMockup({ video, theme, w, h, headline, sub }, setProgress)
      downloadBlob(blob, `mockup-video-${typeId}.${ext}`)
    } finally {
      setRendering(false)
      video.loop = true
      video.play().catch(() => {})
    }
  }

  const cta = CTAS[0]
  const caption = `${headline}\n\n${sub}\n\n${cta}\n\n${hashtagBlock(generateHashtags('feature'))}`

  return (
    <>
      <div className="page-header">
        <h1>Mockup-Studio</h1>
        <p>Screenshot oder Screen-Recording wählen — das Studio setzt beides in den iPhone-Rahmen auf ruhigem Hintergrund. Videos werden direkt als Datei exportiert.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row">
            <Seg options={[{ value: 'image', label: 'Bild' }, { value: 'video', label: 'Video' }]} value={mode} onChange={(m: Mode) => setMode(m)} />
            <Seg options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={(t: PostTheme) => setTheme(t)} />
            {mode === 'video' && (
              <Seg options={[{ value: 'reel', label: 'Reel/TikTok 9:16' }, { value: 'post', label: 'Post 4:5' }]} value={vidFormat} onChange={(f: VidFormat) => setVidFormat(f)} />
            )}
          </div>
        </div>
        <div className="split">
          <div className="card">
            <h3>Vorschau · 1080 × {mode === 'video' && vidFormat === 'reel' ? 1920 : 1350}</h3>
            {(mode === 'image' ? img : video) ? (
              <canvas ref={canvasRef} className="preview-canvas" style={mode === 'video' && vidFormat === 'reel' ? { maxWidth: 300, margin: '0 auto' } : undefined} />
            ) : (
              <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
                {mode === 'image' ? 'Noch kein Screenshot gewählt. Rechts aus der Bibliothek wählen oder neuen hochladen.' : 'Noch kein Video. Rechts ein Screen-Recording hochladen (.mp4/.mov).'}
              </div>
            )}
            {mode === 'image' && img && (
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, `mockup-${typeId}`)}>PNG herunterladen</button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    addPlanned({
                      id: 'mock-' + Date.now().toString(36),
                      date: new Date().toISOString().slice(0, 10),
                      status: 'draft',
                      format: 'mockup',
                      category: 'feature',
                      headline,
                      caption,
                      hashtags: generateHashtags('feature'),
                      thumb: canvasRef.current ? canvasThumb(canvasRef.current) : undefined,
                      createdAt: Date.now(),
                    })
                    setSaved(true)
                  }}
                >
                  {saved ? '✓ Im Planner' : 'In Planner speichern'}
                </button>
              </div>
            )}
            {mode === 'video' && video && (
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={exportVideo} disabled={rendering}>
                  {rendering ? `Rendert … ${Math.round(progress * 100)} %` : 'Video exportieren'}
                </button>
                <span className="hint">Export dauert so lange wie das Video läuft (Echtzeit-Aufnahme).</span>
              </div>
            )}
          </div>
          <div className="stack">
            {mode === 'image' ? (
              <div className="card">
                <h3>Screenshot-Bibliothek</h3>
                <ScreenshotPicker selectedId={pickId} onSelect={(image, id) => { setImg(image); setPickId(id) }} />
                <p className="hint" style={{ marginTop: 10 }}>Der Geräterahmen ersetzt das Freistellen: Der Screenshot wird beschnitten und in die Bühne gesetzt — kein Hintergrund nötig.</p>
              </div>
            ) : (
              <div className="card">
                <h3>Screen-Recording</h3>
                <input type="file" accept="video/*" onChange={e => onVideoFile(e.target.files?.[0])} />
                {videoName && <p className="hint" style={{ marginTop: 8 }}>Geladen: {videoName}{video ? ` · ${Math.round(video.duration)} s` : ''}</p>}
                <p className="hint" style={{ marginTop: 8 }}>
                  Am besten direkt aus dem iOS-Simulator aufnehmen: <code>xcrun simctl io booted recordVideo demo.mp4</code> — oder Bildschirmaufnahme vom iPhone. Export kommt als MP4 (bzw. WebM, je nach Browser) ohne Ton — der Sound kommt beim Posten über Trending-Audio.
                </p>
              </div>
            )}
            <div className="card">
              <h3>Screen-Typ & Texte</h3>
              <div className="row" style={{ marginBottom: 14 }}>
                <Seg options={TYPES.map(t => ({ value: t.id, label: t.label }))} value={typeId} onChange={id => applyType(id, 0)} />
              </div>
              <label className="field-label">Headline</label>
              <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} />
              <label className="field-label" style={{ marginTop: 12 }}>Beschreibung</label>
              <input type="text" value={sub} onChange={e => setSub(e.target.value)} />
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-sm" onClick={() => applyType(typeId, textIdx + 1)}>Neue Text-Idee</button>
              </div>
            </div>
            <div className="card">
              <h3>Caption für diesen Post</h3>
              <div className="mono-block">{caption}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <CopyButton text={caption} label="Caption kopieren" primary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
