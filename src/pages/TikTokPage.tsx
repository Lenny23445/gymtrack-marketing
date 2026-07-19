import { useEffect, useRef, useState } from 'react'
import { CATEGORY_META } from '../lib/types'
import type { Category, PostTheme, TikTokConcept, TikTokSlide, VAlign } from '../lib/types'
import { findIdea, randomIdea } from '../data/ideas'
import { generateTikTok, tiktokAsText, TREND_LINKS } from '../data/tiktok'
import { drawTikTokSlide, drawTikTokShot, downloadCanvas, canvasThumb, DEFAULT_ACCENT, stripRich } from '../lib/canvas'
import { upsertSaved, newPostId } from '../lib/savedPosts'
import { loadImage, useShots } from '../lib/screenshots'
import { useFontsReady, DEFAULT_STYLE } from '../lib/fonts'
import type { TextStyle } from '../lib/fonts'
import type { EditRequest } from '../App'
import { CopyButton, Seg, AccentPicker, StylePicker } from '../components/ui'
import { ScreenshotPicker } from '../components/ScreenshotPicker'

const CATS = (Object.keys(CATEGORY_META) as Category[]).map(c => ({ value: c, label: CATEGORY_META[c].label }))
const ALIGNS: { value: VAlign; label: string }[] = [
  { value: 'top', label: 'Oben' },
  { value: 'center', label: 'Mitte' },
  { value: 'bottom', label: 'Unten' },
]

export default function TikTokPage({ edit }: { edit: EditRequest | null }) {
  const [cat, setCat] = useState<Category>('problem')
  const [theme, setTheme] = useState<PostTheme>('dark')
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [style, setStyle] = useState<TextStyle>(DEFAULT_STYLE)
  const fontsReady = useFontsReady()
  const [concept, setConcept] = useState<TikTokConcept>(() => generateTikTok(randomIdea('problem')))
  const [slideIdx, setSlideIdx] = useState(0)
  const [saved, setSaved] = useState(false)
  // Beim Nachbearbeiten eines gespeicherten TikTok-Posts: id + createdAt merken.
  const [editId, setEditId] = useState<string | null>(null)
  const [editCreatedAt, setEditCreatedAt] = useState<number | null>(null)
  // Screenshot-Bibliothek + geladene Bilder pro ID. Jeder Slide referenziert
  // sein eigenes Bild ueber shotId — so kann jeder Slide ein anderes Bild haben.
  const { shots, add, remove } = useShots()
  const [imgCache, setImgCache] = useState<Record<string, HTMLImageElement>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const idea = findIdea(concept.ideaId)
  const title = idea?.title ?? 'TikTok Slides'
  const slides = concept.slides
  const activeIdx = Math.min(slideIdx, Math.max(0, slides.length - 1))
  // Kopier-/Planner-Text ohne *Sternchen*-Markup (Highlight ist nur fuers Bild).
  const conceptText = tiktokAsText({ ...concept, slides: slides.map(s => ({ ...s, text: stripRich(s.text) })) }, title)

  // Alle Bibliotheks-Bilder einmal vorladen, damit Slides sofort zeichnen koennen.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const sh of shots) {
        if (imgCache[sh.id]) continue
        try {
          const im = await loadImage(sh.dataUrl)
          if (!cancelled) setImgCache(prev => (prev[sh.id] ? prev : { ...prev, [sh.id]: im }))
        } catch {
          /* kaputtes Bild ueberspringen */
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots])

  const drawOne = (c: HTMLCanvasElement, s: TikTokSlide) => {
    const im = s.shotId ? imgCache[s.shotId] : undefined
    if (s.kind === 'shot' && im) drawTikTokShot(c, im, s.text, theme, accent, style)
    else drawTikTokSlide(c, s.text, theme, s.align ?? 'center', accent, style)
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c || slides.length === 0) return
    drawOne(c, slides[activeIdx])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept, slideIdx, theme, imgCache, accent, style, fontsReady])

  // Gespeicherten TikTok-Post aus der Datenbank zum Nachbearbeiten laden.
  useEffect(() => {
    if (!edit || edit.saved.payload.kind !== 'tiktok') return
    const d = edit.saved.payload.data
    setCat(d.concept.category)
    setTheme(d.theme)
    setAccent(d.accent)
    setStyle(d.style ?? DEFAULT_STYLE)
    setConcept(d.concept)
    setSlideIdx(0)
    setEditId(edit.saved.id)
    setEditCreatedAt(edit.saved.createdAt)
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit?.nonce])

  const setSlides = (next: TikTokSlide[]) => {
    setConcept({ ...concept, slides: next })
    setSlideIdx(i => Math.min(i, Math.max(0, next.length - 1)))
    setSaved(false)
  }

  const updSlide = (i: number, patch: Partial<TikTokSlide>) =>
    setSlides(slides.map((s, n) => (n === i ? { ...s, ...patch } : s)))

  // Bild einem Slide zuweisen (aus Bibliothek-Picker oder Inline-Auswahl).
  // Gleiche ID nochmal = abwaehlen. Bild-Zuweisung macht den Slide zum Shot-Slide.
  const assignShot = (i: number, id: string | null) => {
    if (!id || slides[i]?.shotId === id) updSlide(i, { shotId: undefined })
    else updSlide(i, { shotId: id, kind: 'shot' })
  }

  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const next = [...slides]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlides(next)
    setSlideIdx(j)
  }

  const delSlide = (i: number) => {
    if (slides.length <= 1) return
    setSlides(slides.filter((_, n) => n !== i))
  }

  const addTextSlide = () =>
    setSlides([...slides, { text: 'dein text hier', note: 'Eigener Slide', kind: 'text' }])

  const setCount = (n: number) => {
    if (n === slides.length) return
    if (n < slides.length) setSlides(slides.slice(0, n))
    else {
      const extra: TikTokSlide[] = []
      for (let k = slides.length; k < n; k++) extra.push({ text: 'dein text hier', note: 'Eigener Slide', kind: 'text' })
      setSlides([...slides, ...extra])
    }
  }

  // Neues Konzept = neuer Post: Bindung an einen bearbeiteten DB-Eintrag lösen.
  const resetEdit = () => {
    setEditId(null)
    setEditCreatedAt(null)
  }
  const regen = (c: Category = cat) => {
    setConcept(generateTikTok(randomIdea(c)))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }
  const variant = () => {
    setConcept(generateTikTok(idea ?? randomIdea(cat)))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }

  const downloadAll = () => {
    slides.forEach((s, i) => {
      setTimeout(() => {
        const tmp = document.createElement('canvas')
        drawOne(tmp, s)
        downloadCanvas(tmp, `tiktok-${concept.ideaId}-slide-${i + 1}`)
      }, i * 350)
    })
  }

  const save = async () => {
    const now = Date.now()
    const id = editId ?? newPostId()
    await upsertSaved({
      id,
      kind: 'tiktok',
      title,
      category: concept.category,
      thumb: canvasRef.current ? canvasThumb(canvasRef.current) : undefined,
      createdAt: editCreatedAt ?? now,
      updatedAt: now,
      payload: { kind: 'tiktok', data: { concept, theme, accent, style } },
    })
    setEditId(id)
    setEditCreatedAt(editCreatedAt ?? now)
    setSaved(true)
  }

  return (
    <>
      <div className="page-header">
        <h1>TikTok Slides</h1>
        <p>Foto-Slides im 9:16-Format nach TikTok-Viral-Logik. Jeder Slide ist frei editierbar: Text, Position, Reihenfolge, Anzahl — plus App-Screenshot-Slides mit eigenem Bild pro Slide und Live-Trend-Links.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              <Seg options={CATS} value={cat} onChange={c => { setCat(c); regen(c) }} />
              <Seg options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={(t: PostTheme) => setTheme(t)} />
              <span className="hint">Slides:</span>
              <Seg
                options={[1, 2, 3, 4].map(n => ({ value: String(n), label: String(n) }))}
                value={String(slides.length)}
                onChange={v => setCount(Number(v))}
              />
            </div>
            <div className="row">
              <button className="btn" onClick={variant}>Text-Variante</button>
              <button className="btn btn-primary" onClick={() => regen()}>Neues Konzept</button>
            </div>
          </div>
        </div>
        <div className="split">
          <div className="stack">
            <div className="card">
              <h3>Vorschau · 1080 × 1920 · Slide {activeIdx + 1}/{slides.length}</h3>
              <canvas ref={canvasRef} className="preview-canvas" style={{ maxWidth: 300, margin: '0 auto' }} />
              {slides.length > 1 && (
                <div className="slide-nav">
                  <button className="btn btn-sm" onClick={() => setSlideIdx(i => Math.max(0, i - 1))}>←</button>
                  <div className="slide-dots">
                    {slides.map((_, i) => (
                      <span key={i} className={i === activeIdx ? 'on' : ''} onClick={() => setSlideIdx(i)} />
                    ))}
                  </div>
                  <button className="btn btn-sm" onClick={() => setSlideIdx(i => Math.min(slides.length - 1, i + 1))}>→</button>
                </div>
              )}
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={downloadAll}>Alle Slides als PNG</button>
                <button className="btn btn-sm" onClick={save}>
                  {saved ? (editId ? '✓ Aktualisiert' : '✓ Gespeichert') : editId ? 'Änderungen speichern' : 'In Datenbank speichern'}
                </button>
              </div>
            </div>
            <div className="card">
              <h3>Screenshot-Bibliothek</h3>
              <ScreenshotPicker
                selectedId={slides[activeIdx]?.shotId ?? null}
                onSelect={(_img, id) => assignShot(activeIdx, id)}
                library={{ shots, add, remove }}
                hint={`Auswahl gilt für den angezeigten Slide ${activeIdx + 1}. Pro Slide rechts ein eigenes Bild wählbar. Upload auch mit ⌘V.`}
              />
            </div>
            <div className="card">
              <h3>Live-Trends auf TikTok</h3>
              {TREND_LINKS.map(l => (
                <div key={l.label} className="idea-row">
                  <div>
                    <div className="t">{l.label}</div>
                    <div className="s">{l.desc}</div>
                  </div>
                  <a className="btn btn-sm" href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flexShrink: 0 }}>Öffnen ↗</a>
                </div>
              ))}
              <p className="hint" style={{ marginTop: 10 }}>TikTok hat keine offene API — die Links öffnen die echten Live-Rankings (Creative Center, ohne Login einsehbar).</p>
            </div>
          </div>
          <div className="stack">
            <div className="card">
              <h3>Slides bearbeiten · Hook-Typ: {concept.hookType}</h3>
              <StylePicker style={style} onChange={setStyle} />
              <AccentPicker value={accent} onChange={setAccent} />
              {slides.map((s, i) => (
                <div key={i} style={{ borderBottom: i < slides.length - 1 ? '1px solid var(--border)' : 'none', padding: '12px 0' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="tag dark">Slide {i + 1}</span>
                    </span>
                    <span className="row" style={{ gap: 6 }}>
                      <button
                        className={'btn btn-sm' + (s.kind === 'shot' ? ' btn-primary' : '')}
                        onClick={() => updSlide(i, { kind: s.kind === 'shot' ? 'text' : 'shot' })}
                        title="App-Screenshot auf diesem Slide ein-/ausblenden"
                      >
                        Screenshot
                      </button>
                      {s.kind !== 'shot' && (
                        <Seg options={ALIGNS} value={s.align ?? 'center'} onChange={(v: VAlign) => updSlide(i, { align: v })} />
                      )}
                      <button className="btn btn-sm" disabled={i === 0} onClick={() => moveSlide(i, -1)} title="Nach vorne">↑</button>
                      <button className="btn btn-sm" disabled={i === slides.length - 1} onClick={() => moveSlide(i, 1)} title="Nach hinten">↓</button>
                      <button className="btn btn-sm" disabled={slides.length <= 1} onClick={() => delSlide(i)} title="Löschen">×</button>
                    </span>
                  </div>
                  <textarea
                    rows={s.kind === 'shot' ? 2 : 4}
                    value={s.text}
                    onChange={e => updSlide(i, { text: e.target.value })}
                  />
                  {s.kind === 'shot' && (
                    <div style={{ marginTop: 8 }}>
                      <p className="hint" style={{ marginBottom: 6 }}>Bild für diesen Slide:</p>
                      {shots.length === 0 ? (
                        <p className="hint">Noch keine Screenshots — lade links in der Bibliothek welche hoch.</p>
                      ) : (
                        <div className="shot-grid">
                          {shots.map(sh => (
                            <div
                              key={sh.id}
                              className={'shot-tile' + (sh.id === s.shotId ? ' on' : '')}
                              onClick={() => assignShot(i, sh.id)}
                              title={sh.name}
                            >
                              <img src={sh.dataUrl} alt={sh.name} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="hint" style={{ marginTop: 4 }}>{s.note}{s.kind === 'shot' && !s.shotId ? ' — Noch kein Bild gewählt: bis dahin als Text-Slide gerendert.' : ''}</p>
                </div>
              ))}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-sm" onClick={addTextSlide}>+ Slide</button>
              </div>
            </div>
            <div className="card">
              <h3>Sound-Empfehlung</h3>
              <div className="t" style={{ fontWeight: 600 }}>♪ {concept.sound.vibe}</div>
              <p className="hint" style={{ marginTop: 6 }}>{concept.sound.how}</p>
            </div>
            <div className="grid-2">
              <div className="card">
                <h3>Caption</h3>
                <div className="mono-block">{concept.caption}</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <CopyButton text={concept.caption} label="Caption" />
                </div>
              </div>
              <div className="card">
                <h3>Hashtags ({concept.hashtags.length})</h3>
                <div className="mono-block">{concept.hashtags.map(h => '#' + h).join(' ')}</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <CopyButton text={concept.hashtags.map(h => '#' + h).join(' ')} label="Hashtags" />
                </div>
              </div>
            </div>
            <div className="card">
              <h3>So setzt du es um</h3>
              <ul className="suggestions">
                {concept.plan.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p className="hint" style={{ marginTop: 8 }}>Tipp: {concept.postingTip}</p>
              <div className="row" style={{ marginTop: 12 }}>
                <CopyButton text={conceptText} label="Komplettes Konzept kopieren" primary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
