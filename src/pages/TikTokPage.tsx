import { useEffect, useRef, useState } from 'react'
import { CATEGORY_META } from '../lib/types'
import type { Category, PostTheme, SlideBg, Sticker, SlideText, TikTokConcept, TikTokSlide, VAlign } from '../lib/types'
import { findIdea, randomIdea } from '../data/ideas'
import { generateTikTok, tiktokAsText, TREND_LINKS } from '../data/tiktok'
import { drawTikTokSlide, drawTikTokShot, drawStickers, drawSlideTexts, downscalePng, downloadCanvas, canvasThumb, DEFAULT_ACCENT, stripRich } from '../lib/canvas'
import type { TextRect, TextElRect } from '../lib/canvas'
import { upsertSaved, newPostId } from '../lib/savedPosts'
import { loadImage, useShots } from '../lib/screenshots'
import { useFontsReady, DEFAULT_STYLE, FONTS } from '../lib/fonts'
import type { TextStyle, FontKey } from '../lib/fonts'
import type { EditRequest } from '../App'
import { CopyButton, Seg } from '../components/ui'
import { ScreenshotPicker } from '../components/ScreenshotPicker'
import { StickerLayer, SlideTextLayer, TextHandle, PhoneHandle } from '../components/StickerLayer'
import { DesignPanel } from '../components/DesignPanel'
import { RichTextEditor } from '../components/RichTextEditor'

const CATS = (Object.keys(CATEGORY_META) as Category[]).map(c => ({ value: c, label: CATEGORY_META[c].label }))
const ALIGNS: { value: VAlign; label: string }[] = [
  { value: 'top', label: 'Oben' },
  { value: 'center', label: 'Mitte' },
  { value: 'bottom', label: 'Unten' },
]

// Entwurf des aktuell bearbeiteten TikTok-Posts, damit ein Seiten-Reload den Fortschritt
// (Slides, Text/Farben/Schriften, Design, aktiver Slide) nicht verwirft.
const DRAFT_KEY = 'tt-draft-v1'
interface TikTokDraft {
  concept: TikTokConcept
  cat: Category
  theme: PostTheme
  accent: string
  style: TextStyle
  slideIdx: number
  editId: string | null
  editCreatedAt: number | null
}
function readDraft(): TikTokDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (d && d.concept && Array.isArray(d.concept.slides)) return d as TikTokDraft
  } catch {
    /* defekter/zu grosser Draft → ignorieren */
  }
  return null
}

export default function TikTokPage({ edit }: { edit: EditRequest | null }) {
  // Einmalig beim Mounten den gespeicherten Entwurf lesen (vor dem Zufalls-Konzept).
  const [d0] = useState<TikTokDraft | null>(() => readDraft())
  const [cat, setCat] = useState<Category>(d0?.cat ?? 'problem')
  const [theme, setTheme] = useState<PostTheme>(d0?.theme ?? 'dark')
  const [accent, setAccent] = useState(d0?.accent ?? DEFAULT_ACCENT)
  const [style, setStyle] = useState<TextStyle>(d0?.style ?? DEFAULT_STYLE)
  const fontsReady = useFontsReady()
  const [concept, setConcept] = useState<TikTokConcept>(() => d0?.concept ?? generateTikTok(randomIdea('problem')))
  const [slideIdx, setSlideIdx] = useState(d0?.slideIdx ?? 0)
  const [saved, setSaved] = useState(false)
  // Zwingt den Rich-Editor zum Neu-Laden, wenn sich der Slide-Inhalt NICHT durchs
  // Tippen aendert (neues Konzept, Variante, Re-Edit, Anzahl, Loeschen).
  const [editorNonce, setEditorNonce] = useState(0)
  const bumpEditor = () => setEditorNonce(n => n + 1)
  // Hilfslinien (mittig) waehrend das Textfeld gezogen wird.
  const [guides, setGuides] = useState<{ v: boolean; h: boolean } | null>(null)
  // Beim Nachbearbeiten eines gespeicherten TikTok-Posts: id + createdAt merken.
  const [editId, setEditId] = useState<string | null>(d0?.editId ?? null)
  const [editCreatedAt, setEditCreatedAt] = useState<number | null>(d0?.editCreatedAt ?? null)
  // Screenshot-Bibliothek + geladene Bilder pro ID. Jeder Slide referenziert
  // sein eigenes Bild ueber shotId — so kann jeder Slide ein anderes Bild haben.
  const { shots, add, remove } = useShots()
  const [imgCache, setImgCache] = useState<Record<string, HTMLImageElement>>({})
  const [bgImgCache, setBgImgCache] = useState<Record<string, HTMLImageElement>>({})
  const [textRect, setTextRect] = useState<TextRect | null>(null)
  // Geräte-Rechteck auf Screenshot-Slides (für den Verschiebe-/Skalier-Griff).
  const [phoneRect, setPhoneRect] = useState<TextRect | null>(null)
  // Rechtecke der freien Text-Elemente (Canvas liefert sie beim Zeichnen) → DOM-Griffe.
  const [textElRects, setTextElRects] = useState<Record<string, TextElRect>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const idea = findIdea(concept.ideaId)
  const title = idea?.title ?? 'TikTok Slides'
  const slides = concept.slides
  const activeIdx = Math.min(slideIdx, Math.max(0, slides.length - 1))
  const activeSlide = slides[activeIdx]
  const manualPos = activeSlide?.tx != null || activeSlide?.ty != null
  // Kopier-/Planner-Text ohne Markup (Highlight/Farbe ist nur fuers Bild).
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

  // Zeichnet einen Slide vollständig (Hintergrund + Haupttext + freie Text-Elemente)
  // und liefert das Haupt-Text-Rechteck sowie die Rechtecke der freien Text-Elemente.
  const drawOne = (c: HTMLCanvasElement, s: TikTokSlide): { textRect: TextRect | null; phoneRect: TextRect | null; texts: TextElRect[] } => {
    const im = s.shotId ? imgCache[s.shotId] : undefined
    const bgImg = s.bg?.type === 'image' ? bgImgCache[s.bg.dataUrl] : undefined
    let mainRect: TextRect | null = null
    let phoneRect: TextRect | null = null
    if (s.kind === 'shot' && im) {
      phoneRect = drawTikTokShot(c, im, s.text, theme, accent, style, s.bg, bgImg, s.shotLayout)
    } else {
      mainRect = drawTikTokSlide(c, s.text, theme, s.align ?? 'center', accent, style, s.bg, { tx: s.tx, ty: s.ty }, bgImg)
    }
    const texts = drawSlideTexts(c, s.texts, style)
    return { textRect: mainRect, phoneRect, texts }
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c || slides.length === 0) return
    const r = drawOne(c, slides[activeIdx])
    setTextRect(r.textRect)
    setPhoneRect(r.phoneRect)
    setTextElRects(Object.fromEntries(r.texts.map(t => [t.id, t])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept, slideIdx, theme, imgCache, bgImgCache, accent, style, fontsReady])

  // Hintergrund-Bilder aller Slides vorladen, damit drawOne sie synchron zeichnen kann.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const s of slides) {
        if (s.bg?.type !== 'image') continue
        const url = s.bg.dataUrl
        if (bgImgCache[url]) continue
        try {
          const im = await loadImage(url)
          if (!cancelled) setBgImgCache(prev => (prev[url] ? prev : { ...prev, [url]: im }))
        } catch {
          /* kaputtes Bild überspringen */
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept])

  // Aktuellen Bearbeitungsstand als Entwurf sichern → uebersteht Seiten-Reload.
  useEffect(() => {
    const draft: TikTokDraft = { concept, cat, theme, accent, style, slideIdx, editId, editCreatedAt }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* Speicher voll (grosse Bilder) → Entwurf diesmal nicht sichern */
    }
  }, [concept, cat, theme, accent, style, slideIdx, editId, editCreatedAt])

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
    bumpEditor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit?.nonce])

  const setSlides = (next: TikTokSlide[]) => {
    setConcept({ ...concept, slides: next })
    setSlideIdx(i => Math.min(i, Math.max(0, next.length - 1)))
    setSaved(false)
  }

  const updSlide = (i: number, patch: Partial<TikTokSlide>) =>
    setSlides(slides.map((s, n) => (n === i ? { ...s, ...patch } : s)))

  // Sticker importieren (Bild) → mittig auf dem aktiven Slide platzieren, dann frei ziehbar.
  const importSticker = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = async () => {
      const dataUrl = await downscalePng(r.result as string)
      const st: Sticker = {
        id: 'stk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        dataUrl,
        nx: 0.5,
        ny: 0.5,
        nscale: 0.28,
      }
      updSlide(activeIdx, { stickers: [...(slides[activeIdx]?.stickers ?? []), st] })
    }
    r.readAsDataURL(file)
  }

  // ── Freie Text-Elemente ───────────────────────────────────────────────
  const activeTexts = activeSlide?.texts ?? []
  const setTexts = (texts: SlideText[]) => updSlide(activeIdx, { texts })
  const updText = (id: string, patch: Partial<SlideText>) =>
    setTexts(activeTexts.map(t => (t.id === id ? { ...t, ...patch } : t)))
  const delText = (id: string) => setTexts(activeTexts.filter(t => t.id !== id))
  const addTextEl = () => {
    const el: SlideText = {
      id: 'txt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      text: 'Text',
      nx: 0.5,
      // leicht versetzt stapeln, damit neue Felder nicht exakt übereinander liegen
      ny: 0.5 + Math.min(0.3, activeTexts.length * 0.08),
      nsize: 0.09,
      color: theme === 'dark' ? '#FFFFFF' : '#0A0A0A',
    }
    setTexts([...activeTexts, el])
  }

  // ── Screenshot-Slide: Gerät verschieben/skalieren ─────────────────────
  const shotScale = activeSlide?.shotLayout?.scale ?? 1
  const moveShot = (nx: number, ny: number) =>
    updSlide(activeIdx, { shotLayout: { nx, ny, scale: activeSlide?.shotLayout?.scale ?? 1 } })
  const scaleShot = (scale: number) =>
    updSlide(activeIdx, {
      shotLayout: {
        nx: activeSlide?.shotLayout?.nx ?? phoneRect?.nx ?? 0.5,
        ny: activeSlide?.shotLayout?.ny ?? phoneRect?.ny ?? 0.62,
        scale,
      },
    })
  const resetShot = () => updSlide(activeIdx, { shotLayout: undefined })

  const setBg = (b: SlideBg) => updSlide(activeIdx, { bg: b })
  const moveText = (tx: number, ty: number) => updSlide(activeIdx, { tx, ty })
  const resetTextPos = () => updSlide(activeIdx, { tx: undefined, ty: undefined })
  // Ausrichtung waehlen setzt die manuelle Position zurueck — sonst wuerde tx/ty die
  // automatische Oben/Mitte/Unten-Platzierung weiter ueberschreiben (der alte Bug).
  const setAlign = (v: VAlign) => updSlide(activeIdx, { align: v, tx: undefined, ty: undefined })

  // Bild einem Slide zuweisen (aus Bibliothek-Picker oder Inline-Auswahl).
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
    bumpEditor()
  }

  const addTextSlide = () => {
    setSlides([...slides, { text: 'dein text hier', note: 'Eigener Slide', kind: 'text' }])
    setSlideIdx(slides.length)
  }

  const setCount = (n: number) => {
    if (n === slides.length) return
    if (n < slides.length) setSlides(slides.slice(0, n))
    else {
      const extra: TikTokSlide[] = []
      for (let k = slides.length; k < n; k++) extra.push({ text: 'dein text hier', note: 'Eigener Slide', kind: 'text' })
      setSlides([...slides, ...extra])
    }
    bumpEditor()
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
    bumpEditor()
  }
  const variant = () => {
    setConcept(generateTikTok(idea ?? randomIdea(cat)))
    setSlideIdx(0)
    setSaved(false)
    resetEdit()
    bumpEditor()
  }

  const downloadAll = () => {
    slides.forEach((s, i) => {
      setTimeout(async () => {
        const tmp = document.createElement('canvas')
        drawOne(tmp, s)
        await drawStickers(tmp, s.stickers)
        downloadCanvas(tmp, `tiktok-${concept.ideaId}-slide-${i + 1}`)
      }, i * 350)
    })
  }

  const save = async () => {
    const now = Date.now()
    const id = editId ?? newPostId()
    let thumb: string | undefined
    if (activeSlide) {
      const tmp = document.createElement('canvas')
      drawOne(tmp, activeSlide)
      await drawStickers(tmp, activeSlide.stickers)
      thumb = canvasThumb(tmp)
    }
    await upsertSaved({
      id,
      kind: 'tiktok',
      title,
      category: concept.category,
      thumb,
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
        <p>Foto-Slides im 9:16-Format. Text markieren und einfärben, Schriftart & Hintergrund wählen, frei positionieren — alles neben der Live-Vorschau.</p>
      </div>
      <div className="stack">
        <div className="card tt-controls">
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

        <div className="tt-split">
          {/* ── LINKS: grosse, klebende Live-Vorschau ── */}
          <div className="tt-preview-col">
            <div className="card">
              <h3>Vorschau · Slide {activeIdx + 1}/{slides.length}</h3>
              <div ref={stageRef} className="sticker-stage tt-stage">
                <canvas ref={canvasRef} className="preview-canvas" />
                {guides && <span className={'tt-guide v' + (guides.v ? ' on' : '')} />}
                {guides && <span className={'tt-guide h' + (guides.h ? ' on' : '')} />}
                <StickerLayer
                  stickers={activeSlide?.stickers ?? []}
                  stageRef={stageRef}
                  onChange={st => updSlide(activeIdx, { stickers: st })}
                  onGuides={setGuides}
                />
                <SlideTextLayer
                  texts={activeTexts}
                  rects={textElRects}
                  stageRef={stageRef}
                  onChange={setTexts}
                  onEdit={id => {
                    const el = document.getElementById('txt-edit-' + id) as HTMLTextAreaElement | null
                    el?.focus()
                    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  }}
                  onGuides={setGuides}
                />
                {textRect && activeSlide?.kind !== 'shot' && (
                  <TextHandle rect={textRect} stageRef={stageRef} onMove={moveText} onGuides={setGuides} />
                )}
                {phoneRect && activeSlide?.kind === 'shot' && (
                  <PhoneHandle
                    rect={phoneRect}
                    scale={shotScale}
                    stageRef={stageRef}
                    onMove={moveShot}
                    onScale={scaleShot}
                    onGuides={setGuides}
                  />
                )}
              </div>
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm" onClick={addTextEl} title="Freies Textfeld auf diesem Slide hinzufügen">＋ Textfeld</button>
                {activeSlide?.kind === 'shot' && (
                  <button
                    className="btn btn-sm"
                    disabled={!activeSlide?.shotLayout}
                    onClick={resetShot}
                    title="Screenshot wieder automatisch anordnen"
                  >
                    ⌖ Screenshot zurück
                  </button>
                )}
              </div>
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
              <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                <button className="btn btn-sm" disabled={!manualPos} onClick={resetTextPos} title="Text wieder mittig ausrichten">
                  ⌖ Position mittig
                </button>
                <div className="row">
                  <button className="btn btn-sm" onClick={save}>
                    {saved ? (editId ? '✓ Aktualisiert' : '✓ Gespeichert') : editId ? 'Speichern' : 'In Datenbank'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={downloadAll}>Alle als PNG</button>
                </div>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                Text am „Text"-Griff ziehen (rastet mittig ein), Sticker direkt anfassen. Ausrichtung Oben/Mitte/Unten setzt die Position zurück.
              </p>
            </div>
          </div>

          {/* ── RECHTS: alle Werkzeuge + Slide-Text + Textbausteine ── */}
          <div className="tt-tools-col">
            <div className="card">
              <h3>Text · Slide {activeIdx + 1}</h3>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <button
                  className={'btn btn-sm' + (activeSlide?.kind === 'shot' ? ' btn-primary' : '')}
                  onClick={() => updSlide(activeIdx, { kind: activeSlide?.kind === 'shot' ? 'text' : 'shot' })}
                  title="App-Screenshot auf diesem Slide ein-/ausblenden"
                >
                  Screenshot-Slide
                </button>
                {activeSlide?.kind !== 'shot' && <Seg options={ALIGNS} value={activeSlide?.align ?? 'center'} onChange={setAlign} />}
              </div>
              <RichTextEditor
                key={activeIdx + ':' + editorNonce}
                value={activeSlide?.text ?? ''}
                onChange={t => updSlide(activeIdx, { text: t })}
                accent={accent}
                rows={activeSlide?.kind === 'shot' ? 2 : 4}
                ariaLabel={`Text von Slide ${activeIdx + 1}`}
              />
              {activeSlide?.kind === 'shot' && (
                <div style={{ marginTop: 10 }}>
                  <p className="hint" style={{ marginBottom: 6 }}>Bild für diesen Slide:</p>
                  {shots.length === 0 ? (
                    <p className="hint">Noch keine Screenshots — lade unten in der Bibliothek welche hoch.</p>
                  ) : (
                    <div className="shot-grid">
                      {shots.map(sh => (
                        <div
                          key={sh.id}
                          className={'shot-tile' + (sh.id === activeSlide.shotId ? ' on' : '')}
                          onClick={() => assignShot(activeIdx, sh.id)}
                          title={sh.name}
                        >
                          <img src={sh.dataUrl} alt={sh.name} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Slide-Streifen: umschalten, verschieben, hinzufügen, löschen */}
              <div className="tt-strip">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    className={'tt-chip' + (i === activeIdx ? ' on' : '')}
                    onClick={() => setSlideIdx(i)}
                    title={stripRich(s.text).slice(0, 40)}
                  >
                    <span className="tt-chip-n">{i + 1}</span>
                    <span className="tt-chip-t">{stripRich(s.text).slice(0, 16) || 'leer'}</span>
                  </button>
                ))}
                <button className="tt-chip tt-chip-add" onClick={addTextSlide} title="Slide hinzufügen">＋</button>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-sm" disabled={activeIdx === 0} onClick={() => moveSlide(activeIdx, -1)}>← Vor</button>
                <button className="btn btn-sm" disabled={activeIdx === slides.length - 1} onClick={() => moveSlide(activeIdx, 1)}>Zurück →</button>
                <button className="btn btn-sm" disabled={slides.length <= 1} onClick={() => delSlide(activeIdx)}>Slide löschen</button>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>Hook-Typ: {concept.hookType}. {activeSlide?.note}</p>
            </div>

            <div className="card">
              <h3>Design</h3>
              <DesignPanel
                style={style}
                onStyle={setStyle}
                accent={accent}
                onAccent={setAccent}
                bg={activeSlide?.bg}
                onBg={setBg}
                onImportSticker={importSticker}
                stickerCount={activeSlide?.stickers?.length ?? 0}
              />
            </div>

            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Freie Textfelder ({activeTexts.length})</h3>
                <button className="btn btn-sm btn-primary" onClick={addTextEl}>＋ Hinzufügen</button>
              </div>
              {activeTexts.length === 0 ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  Zusätzliche Textfelder frei auf dem Slide platzieren. „Hinzufügen" klicken, dann in der Vorschau ziehen,
                  an der Ecke skalieren, am grünen Griff drehen.
                </p>
              ) : (
                <div className="txt-el-list">
                  {activeTexts.map((t, i) => (
                    <div className="txt-el-row" key={t.id}>
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="hint">Textfeld {i + 1}</span>
                        <button className="btn btn-sm" onClick={() => delText(t.id)}>Löschen</button>
                      </div>
                      <textarea
                        id={'txt-edit-' + t.id}
                        value={t.text}
                        rows={2}
                        onChange={e => updText(t.id, { text: e.target.value })}
                        placeholder="Text …"
                      />
                      <div className="row" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={t.color}
                          onChange={e => updText(t.id, { color: e.target.value })}
                          title="Farbe"
                          style={{ width: 36, height: 30, padding: 0, border: 'none', background: 'none' }}
                        />
                        <select
                          value={t.font ?? 'sans'}
                          onChange={e => updText(t.id, { font: e.target.value as FontKey })}
                          title="Schriftart"
                        >
                          {FONTS.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Screenshot-Bibliothek</h3>
              <ScreenshotPicker
                selectedId={activeSlide?.shotId ?? null}
                onSelect={(_img, id) => assignShot(activeIdx, id)}
                library={{ shots, add, remove }}
                hint={`Auswahl gilt für Slide ${activeIdx + 1}. Pro Slide ein eigenes Bild. Upload auch mit ⌘V.`}
              />
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
              <div className="tt-trends">
                {TREND_LINKS.map(l => (
                  <a key={l.label} className="btn btn-sm" href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
