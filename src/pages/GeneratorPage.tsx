import { useEffect, useRef, useState } from 'react'
import type { GeneratorRequest, EditRequest } from '../App'
import { CATEGORY_META, FORMAT_META } from '../lib/types'
import type { Category, GeneratedPost, PostFormat, PostTheme, Slide, VAlign } from '../lib/types'
import { findIdea, randomIdea } from '../data/ideas'
import { generatePost, fullCaption, hashtagBlock } from '../lib/generator'
import { scorePost } from '../lib/scoring'
import { drawPost, drawSlide, drawMockup, downloadCanvas, canvasThumb, DEFAULT_ACCENT, stripRich } from '../lib/canvas'
import { upsertSaved, newPostId } from '../lib/savedPosts'
import { loadShotImage } from '../lib/screenshots'
import { useFontsReady, DEFAULT_STYLE } from '../lib/fonts'
import type { TextStyle } from '../lib/fonts'
import { CopyButton, ScoreCard, Seg, AccentPicker, StylePicker } from '../components/ui'
import { ScreenshotPicker } from '../components/ScreenshotPicker'

const CATS = (Object.keys(CATEGORY_META) as Category[]).map(c => ({ value: c, label: CATEGORY_META[c].label }))
const FORMATS = (Object.keys(FORMAT_META) as PostFormat[]).map(f => ({ value: f, label: FORMAT_META[f].label }))

export default function GeneratorPage({ request, edit }: { request: GeneratorRequest | null; edit: EditRequest | null }) {
  const [category, setCategory] = useState<Category>('education')
  const [format, setFormat] = useState<PostFormat>('single')
  const [theme, setTheme] = useState<PostTheme>('dark')
  const [post, setPost] = useState<GeneratedPost>(() => generatePost(randomIdea('education'), 'single', 'dark'))
  const [slideIdx, setSlideIdx] = useState(0)
  const [saved, setSaved] = useState(false)
  // Beim Bearbeiten eines gespeicherten Posts: id + createdAt merken -> Update statt Neuanlage.
  const [editId, setEditId] = useState<string | null>(null)
  const [editCreatedAt, setEditCreatedAt] = useState<number | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [pickId, setPickId] = useState<string | null>(null)
  const [visual, setVisual] = useState<'typo' | 'shot' | 'promo'>('typo')
  const [vAlign, setVAlign] = useState<VAlign>('center')
  // Instagram-Seitenverhaeltnis: 4:5 (groesser im Feed, im Profil-Raster
  // oben/unten beschnitten) oder 1:1 (wird nirgends beschnitten)
  const [aspect, setAspect] = useState<'45' | '11'>('45')
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [style, setStyle] = useState<TextStyle>(DEFAULT_STYLE)
  const fontsReady = useFontsReady()
  const postH = format === 'story' ? 1920 : aspect === '11' ? 1080 : 1350
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Slide-Editor (Carousel): Texte aendern, tauschen, loeschen, ergaenzen
  const renumber = (arr: Slide[]): Slide[] => arr.map((s, n) => ({ ...s, index: n + 1, total: arr.length }))
  const setSlides = (next: Slide[]) => {
    setPost({ ...post, slides: renumber(next) })
    setSlideIdx(i => Math.min(i, next.length - 1))
    setSaved(false)
  }
  const updSlide = (i: number, patch: Partial<Slide>) =>
    setSlides(post.slides!.map((s, n) => (n === i ? { ...s, ...patch } : s)))
  const moveSlide = (i: number, dir: -1 | 1) => {
    const sl = post.slides!
    const j = i + dir
    if (j < 0 || j >= sl.length) return
    const next = [...sl]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlides(next)
    setSlideIdx(j)
  }
  const delSlide = (i: number) => {
    if (post.slides!.length <= 2) return
    setSlides(post.slides!.filter((_, n) => n !== i))
  }
  const addSlide = () => {
    const sl = post.slides!
    setSlides([...sl.slice(0, sl.length - 1), { kind: 'point', heading: 'Neuer Punkt', body: 'Text hier eingeben.', index: 0, total: 0 }, sl[sl.length - 1]])
  }

  const handleSelect = (image: HTMLImageElement | null, id: string | null) => {
    setImg(image)
    setPickId(id)
    if (image && visual === 'typo') setVisual('shot')
    if (!image) setVisual('typo')
  }

  // Anfrage aus Datenbank: frische Idee öffnen -> als neuer Post behandeln.
  useEffect(() => {
    if (!request) return
    const idea = findIdea(request.ideaId)
    if (!idea) return
    const f = request.format ?? 'single'
    setCategory(idea.cat)
    setFormat(f)
    setPost(generatePost(idea, f, theme))
    setSlideIdx(0)
    setSaved(false)
    setEditId(null)
    setEditCreatedAt(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  // Gespeicherten Post aus der Datenbank zum Nachbearbeiten laden (voller Zustand).
  useEffect(() => {
    if (!edit || edit.saved.payload.kind !== 'ig') return
    const p = edit.saved.payload.data
    setCategory(p.post.category)
    setFormat(p.format)
    setTheme(p.theme)
    setAccent(p.accent)
    setStyle(p.style ?? DEFAULT_STYLE)
    setAspect(p.aspect)
    setVisual(p.visual)
    setVAlign(p.vAlign)
    setPost(p.post)
    setSlideIdx(0)
    setEditId(edit.saved.id)
    setEditCreatedAt(edit.saved.createdAt)
    setSaved(false)
    ;(async () => {
      const im = await loadShotImage(p.shotId)
      setImg(im)
      setPickId(p.shotId)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit?.nonce])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    if (format === 'carousel' && post.slides) {
      const s = post.slides[Math.min(slideIdx, post.slides.length - 1)]
      if ((s.withShot || s.kind === 'shot') && img) {
        drawMockup(c, { img, headline: s.heading, sub: s.body ?? '', theme, w: 1080, h: postH, kickerText: CATEGORY_META[post.category].kicker, accent, style })
      } else {
        drawSlide(c, s, theme, CATEGORY_META[post.category].kicker, postH, accent, style)
      }
    } else if (img && visual !== 'typo') {
      // 'shot': Idee-Text + Screenshot im Geraet · 'promo': CTA gross + Screenshot
      drawMockup(c, {
        img,
        headline: visual === 'promo' ? post.cta : post.headline,
        sub: visual === 'promo' ? post.headline : post.sub,
        theme,
        w: 1080,
        h: postH,
        kickerText: CATEGORY_META[post.category].kicker,
        accent,
        style,
      })
    } else {
      drawPost(c, {
        kickerText: CATEGORY_META[post.category].kicker,
        headline: post.headline,
        sub: post.sub,
        theme,
        w: 1080,
        h: postH,
        vAlign,
        accent,
        style,
      })
    }
  }, [post, slideIdx, theme, format, img, visual, vAlign, postH, accent, style, fontsReady])

  // Neue Generierung = neuer Post: Bindung an einen bearbeiteten DB-Eintrag lösen.
  const resetEdit = () => {
    setEditId(null)
    setEditCreatedAt(null)
  }
  const newIdea = () => {
    setPost(generatePost(randomIdea(category, post.ideaId), format, theme))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }
  const newVariant = () => {
    const idea = findIdea(post.ideaId) ?? randomIdea(category)
    setPost(generatePost(idea, format, theme))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }
  const changeCat = (c: Category) => {
    setCategory(c)
    setPost(generatePost(randomIdea(c), format, theme))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }
  const changeFormat = (f: PostFormat) => {
    setFormat(f)
    const idea = findIdea(post.ideaId) ?? randomIdea(category)
    setPost(generatePost(idea, f, theme))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
  }

  const download = () => {
    if (format === 'carousel' && post.slides) {
      post.slides.forEach((s, i) => {
        setTimeout(() => {
          const tmp = document.createElement('canvas')
          if ((s.withShot || s.kind === 'shot') && img) {
            drawMockup(tmp, { img, headline: s.heading, sub: s.body ?? '', theme, w: 1080, h: postH, kickerText: CATEGORY_META[post.category].kicker, accent, style })
          } else {
            drawSlide(tmp, s, theme, CATEGORY_META[post.category].kicker, postH, accent, style)
          }
          downloadCanvas(tmp, `${post.ideaId}-slide-${i + 1}`)
        }, i * 350)
      })
    } else if (canvasRef.current) {
      downloadCanvas(canvasRef.current, `${post.ideaId}-${format}`)
    }
  }

  const saveToDb = async () => {
    const now = Date.now()
    const id = editId ?? newPostId()
    await upsertSaved({
      id,
      kind: 'ig',
      title: stripRich(post.headline) || 'Instagram Post',
      category: post.category,
      thumb: canvasRef.current ? canvasThumb(canvasRef.current) : undefined,
      createdAt: editCreatedAt ?? now,
      updatedAt: now,
      payload: { kind: 'ig', data: { post, format, theme, accent, aspect, visual, vAlign, shotId: pickId, style } },
    })
    setEditId(id)
    setEditCreatedAt(editCreatedAt ?? now)
    setSaved(true)
  }

  const score = scorePost(post)

  return (
    <>
      <div className="page-header">
        <h1>Instagram Post-Generator</h1>
        <p>Kategorie und Format wählen — das Studio erzeugt Visual, Hook, Caption, CTA und Hashtags in einem Schritt. Für Single Post &amp; Story lässt sich ein App-Screenshot einbauen.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              <Seg options={CATS} value={category} onChange={changeCat} />
              <Seg options={FORMATS} value={format} onChange={changeFormat} />
              {format !== 'story' && (
                <Seg
                  options={[{ value: '45', label: '4:5' }, { value: '11', label: '1:1 Quadrat' }]}
                  value={aspect}
                  onChange={(a: '45' | '11') => setAspect(a)}
                />
              )}
              <Seg options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={(t: PostTheme) => setTheme(t)} />
            </div>
            <div className="row">
              <button className="btn" onClick={newVariant}>Text-Variante</button>
              <button className="btn btn-primary" onClick={newIdea}>Neue Idee</button>
            </div>
          </div>
        </div>
        <div className="split">
          <div className="stack">
            <div className="card">
              <h3>Vorschau · {FORMAT_META[format].label}</h3>
              {format !== 'carousel' && (
                <div className="row" style={{ marginBottom: 12 }}>
                  <Seg
                    options={[{ value: 'typo', label: 'Typo' }, { value: 'shot', label: 'Screenshot' }, { value: 'promo', label: 'Promo' }]}
                    value={visual}
                    onChange={(v: 'typo' | 'shot' | 'promo') => setVisual(v)}
                  />
                  {visual === 'typo' && (
                    <Seg
                      options={[{ value: 'top', label: 'Oben' }, { value: 'center', label: 'Mitte' }, { value: 'bottom', label: 'Unten' }]}
                      value={vAlign}
                      onChange={(v: VAlign) => setVAlign(v)}
                    />
                  )}
                </div>
              )}
              {format !== 'carousel' && visual !== 'typo' && !img && (
                <p className="hint" style={{ marginBottom: 10 }}>Wähle unten einen Screenshot aus der Bibliothek — bis dahin Typo-Ansicht.</p>
              )}
              <canvas ref={canvasRef} className="preview-canvas" />
              {format === 'carousel' && post.slides && (
                <div className="slide-nav">
                  <button className="btn btn-sm" onClick={() => setSlideIdx(i => Math.max(0, i - 1))}>←</button>
                  <div className="slide-dots">
                    {post.slides.map((_, i) => (
                      <span key={i} className={i === slideIdx ? 'on' : ''} onClick={() => setSlideIdx(i)} />
                    ))}
                  </div>
                  <button className="btn btn-sm" onClick={() => setSlideIdx(i => Math.min(post.slides!.length - 1, i + 1))}>→</button>
                </div>
              )}
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={download}>
                  {format === 'carousel' ? 'Alle Slides als PNG' : 'PNG herunterladen'}
                </button>
                <button className="btn btn-sm" onClick={saveToDb}>
                  {saved ? (editId ? '✓ Aktualisiert' : '✓ Gespeichert') : editId ? 'Änderungen speichern' : 'In Datenbank speichern'}
                </button>
              </div>
            </div>
            <div className="card">
              <h3>Screenshot-Bibliothek</h3>
              <ScreenshotPicker selectedId={pickId} onSelect={handleSelect} hint={format === 'carousel' ? 'Screenshot wählen, dann rechts „+ Screenshot-Slide“.' : undefined} />
            </div>
            <ScoreCard score={score} />
          </div>
          <div className="stack">
            <div className="card">
              <h3>{format === 'carousel' ? `Slides bearbeiten (${post.slides?.length ?? 0})` : 'Texte bearbeiten'}</h3>
              <StylePicker style={style} onChange={setStyle} />
              <AccentPicker value={accent} onChange={setAccent} />
              {format === 'carousel' && post.slides ? (
                <>
                  {post.slides.map((s, i) => (
                    <div key={i} style={{ borderBottom: i < post.slides!.length - 1 ? '1px solid var(--border)' : 'none', padding: '12px 0' }}>
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="row" style={{ gap: 8 }}>
                          <span className="tag dark">Slide {i + 1}</span>
                          <span className="tag">{s.kind === 'cover' ? 'Cover' : s.kind === 'cta' ? 'CTA' : 'Punkt'}</span>
                        </span>
                        <span className="row" style={{ gap: 6 }}>
                          <button
                            className={'btn btn-sm' + (s.withShot ? ' btn-primary' : '')}
                            onClick={() => updSlide(i, { withShot: !s.withShot })}
                            title="App-Screenshot auf diesem Slide ein-/ausblenden"
                          >
                            Screenshot
                          </button>
                          <button className="btn btn-sm" disabled={i === 0} onClick={() => moveSlide(i, -1)} title="Nach vorne">↑</button>
                          <button className="btn btn-sm" disabled={i === post.slides!.length - 1} onClick={() => moveSlide(i, 1)} title="Nach hinten">↓</button>
                          <button className="btn btn-sm" disabled={post.slides!.length <= 2} onClick={() => delSlide(i)} title="Löschen">×</button>
                        </span>
                      </div>
                      <input type="text" value={s.heading} onChange={e => updSlide(i, { heading: e.target.value })} />
                      <textarea rows={2} value={s.body ?? ''} onChange={e => updSlide(i, { body: e.target.value })} style={{ marginTop: 6 }} />
                      {s.withShot && !img && (
                        <p className="hint" style={{ marginTop: 4 }}>Noch kein Screenshot gewählt — links in der Bibliothek anklicken, sonst rendert der Slide als Text.</p>
                      )}
                    </div>
                  ))}
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn btn-sm" onClick={addSlide}>+ Slide</button>
                  </div>
                </>
              ) : (
                <>
                  <label className="field-label">Headline</label>
                  <input type="text" value={post.headline} onChange={e => { setPost({ ...post, headline: e.target.value }); setSaved(false) }} />
                  <label className="field-label" style={{ marginTop: 12 }}>Subline</label>
                  <textarea rows={2} value={post.sub} onChange={e => { setPost({ ...post, sub: e.target.value }); setSaved(false) }} />
                  <label className="field-label" style={{ marginTop: 12 }}>CTA (Promo-Visual)</label>
                  <input type="text" value={post.cta} onChange={e => { setPost({ ...post, cta: e.target.value }); setSaved(false) }} />
                </>
              )}
            </div>
            <div className="card">
              <h3>Caption & Hashtags</h3>
              <div className="mono-block">{post.caption}</div>
              <label className="field-label" style={{ marginTop: 12 }}>Hashtags ({post.hashtags.length})</label>
              <div className="mono-block">{hashtagBlock(post.hashtags)}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <CopyButton text={fullCaption(post)} label="Alles kopieren" primary />
                <CopyButton text={post.caption} label="Nur Caption" />
                <CopyButton text={hashtagBlock(post.hashtags)} label="Nur Hashtags" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
