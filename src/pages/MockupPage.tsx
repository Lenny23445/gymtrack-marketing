import { useEffect, useRef, useState } from 'react'
import type { PostTheme } from '../lib/types'
import { drawMockup, downloadCanvas, canvasThumb } from '../lib/canvas'
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

export default function MockupPage() {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [pickId, setPickId] = useState<string | null>(null)
  const [typeId, setTypeId] = useState('overview')
  const [textIdx, setTextIdx] = useState(0)
  const [headline, setHeadline] = useState(TYPES[0].texts[0].h)
  const [sub, setSub] = useState(TYPES[0].texts[0].s)
  const [theme, setTheme] = useState<PostTheme>('dark')
  const [saved, setSaved] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const applyType = (id: string, idx: number) => {
    const t = TYPES.find(x => x.id === id)!
    const text = t.texts[idx % t.texts.length]
    setTypeId(id)
    setTextIdx(idx % t.texts.length)
    setHeadline(text.h)
    setSub(text.s)
  }

  useEffect(() => {
    if (!img || !canvasRef.current) return
    drawMockup(canvasRef.current, { img, headline, sub, theme })
  }, [img, headline, sub, theme])

  const cta = CTAS[0]
  const caption = `${headline}\n\n${sub}\n\n${cta}\n\n${hashtagBlock(generateHashtags('feature'))}`

  return (
    <>
      <div className="page-header">
        <h1>Mockup-Studio</h1>
        <p>App-Screenshot hochladen — das Studio setzt ihn in einen iPhone-Rahmen im Apple-Marketing-Stil und generiert passende Texte.</p>
      </div>
      <div className="split">
        <div className="card">
          <h3>Vorschau · 1080 × 1350</h3>
          {img ? (
            <canvas ref={canvasRef} className="preview-canvas" />
          ) : (
            <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
              Noch kein Screenshot gewählt. Rechts aus der Bibliothek wählen oder neuen hochladen.
            </div>
          )}
          {img && (
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
        </div>
        <div className="stack">
          <div className="card">
            <h3>Screenshot-Bibliothek</h3>
            <ScreenshotPicker selectedId={pickId} onSelect={(image, id) => { setImg(image); setPickId(id) }} />
            <p className="hint" style={{ marginTop: 10 }}>Der Geräterahmen ersetzt das Freistellen: Der Screenshot wird beschnitten und in die Bühne gesetzt — kein Hintergrund nötig.</p>
          </div>
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
              <Seg options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={(t: PostTheme) => setTheme(t)} />
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
    </>
  )
}
