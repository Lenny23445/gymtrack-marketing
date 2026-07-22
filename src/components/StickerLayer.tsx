import { useRef } from 'react'
import type { Sticker, SlideText } from '../lib/types'
import { FONT_STACKS } from '../lib/fonts'

// Interaktive Sticker-Ebene ÜBER dem Vorschau-Canvas. Jeder Sticker ist per Maus/
// Touch frei verschiebbar (ziehen) und in der Ecke skalierbar; × löscht ihn.
// Positionen sind Anteile (0..1) der Bühne → passen 1:1 zum Canvas-Export.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
// Mittig einrasten (wie Insta-Story) — genutzt von Sticker- UND Text-Elementen.
const SNAP = 0.025
export type Guides = { v: boolean; h: boolean } | null

function StickerItem({
  s,
  stageRef,
  onChange,
  onDelete,
  onGuides,
}: {
  s: Sticker
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (s: Sticker) => void
  onDelete: () => void
  onGuides?: (g: Guides) => void
}) {
  const mode = useRef<null | 'move' | 'resize' | 'rotate'>(null)
  // cx/cy = Sticker-Mittelpunkt in Client-Pixeln (fuer die Winkelberechnung beim Drehen).
  const start = useRef({ px: 0, py: 0, nx: 0, ny: 0, nscale: 0, cx: 0, cy: 0 })

  const begin = (e: React.PointerEvent, m: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    mode.current = m
    const r = stageRef.current?.getBoundingClientRect()
    start.current = {
      px: e.clientX,
      py: e.clientY,
      nx: s.nx,
      ny: s.ny,
      nscale: s.nscale,
      cx: r ? r.left + s.nx * r.width : e.clientX,
      cy: r ? r.top + s.ny * r.height : e.clientY,
    }
  }

  const move = (e: React.PointerEvent) => {
    if (!mode.current || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    if (mode.current === 'move') {
      let nx = clamp(start.current.nx + (e.clientX - start.current.px) / r.width, 0, 1)
      let ny = clamp(start.current.ny + (e.clientY - start.current.py) / r.height, 0, 1)
      const v = Math.abs(nx - 0.5) < SNAP
      const h = Math.abs(ny - 0.5) < SNAP
      if (v) nx = 0.5
      if (h) ny = 0.5
      onGuides?.({ v, h })
      onChange({ ...s, nx, ny })
    } else if (mode.current === 'resize') {
      onChange({ ...s, nscale: clamp(start.current.nscale + ((e.clientX - start.current.px) / r.width) * 2, 0.05, 1.4) })
    } else {
      // Drehen: Winkel vom Mittelpunkt zum Zeiger. Griff sitzt oben → +90°, damit
      // „Zeiger direkt oben" 0° bedeutet.
      const ang = (Math.atan2(e.clientY - start.current.cy, e.clientX - start.current.cx) * 180) / Math.PI + 90
      onChange({ ...s, rot: Math.round((ang % 360) + 360) % 360 })
    }
  }

  const end = (e: React.PointerEvent) => {
    mode.current = null
    onGuides?.(null)
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  return (
    <div
      className="stk"
      style={{
        left: `${s.nx * 100}%`,
        top: `${s.ny * 100}%`,
        width: `${s.nscale * 100}%`,
        transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)`,
      }}
      onPointerDown={e => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
    >
      <img src={s.dataUrl} alt="" draggable={false} />
      <button
        className="stk-del"
        title="Sticker löschen"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ×
      </button>
      <span
        className="stk-rotate"
        title="Drehen"
        onPointerDown={e => begin(e, 'rotate')}
        onPointerMove={move}
        onPointerUp={end}
      />
      <span
        className="stk-resize"
        title="Größe ziehen"
        onPointerDown={e => begin(e, 'resize')}
        onPointerMove={move}
        onPointerUp={end}
      />
    </div>
  )
}

// Verschiebe-Griff für den Text (Text bleibt auf dem Canvas; dieser transparente
// Kasten liegt darüber und aktualisiert die Textposition tx/ty beim Ziehen).
export function TextHandle({
  rect,
  stageRef,
  onMove,
  onGuides,
}: {
  rect: { nx: number; ny: number; nw: number; nh: number }
  stageRef: React.RefObject<HTMLDivElement>
  onMove: (tx: number, ty: number) => void
  // Hilfslinien-Status waehrend des Ziehens (mittig einrasten wie in einer Insta-Story).
  onGuides?: (g: { v: boolean; h: boolean } | null) => void
}) {
  const drag = useRef(false)
  const start = useRef({ px: 0, py: 0, nx: 0, ny: 0 })
  const begin = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = true
    start.current = { px: e.clientX, py: e.clientY, nx: rect.nx, ny: rect.ny }
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    let nx = clamp(start.current.nx + (e.clientX - start.current.px) / r.width, 0, 1)
    let ny = clamp(start.current.ny + (e.clientY - start.current.py) / r.height, 0, 1)
    const v = Math.abs(nx - 0.5) < SNAP
    const h = Math.abs(ny - 0.5) < SNAP
    if (v) nx = 0.5
    if (h) ny = 0.5
    onGuides?.({ v, h })
    onMove(nx, ny)
  }
  const end = (e: React.PointerEvent) => {
    drag.current = false
    onGuides?.(null)
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }
  return (
    <div
      className="txt-handle"
      style={{
        left: `${rect.nx * 100}%`,
        top: `${rect.ny * 100}%`,
        width: `${Math.max(rect.nw, 0.2) * 100}%`,
        height: `${Math.max(rect.nh, 0.06) * 100}%`,
      }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
    >
      <span className="txt-handle-tag">Text</span>
    </div>
  )
}

export function StickerLayer({
  stickers,
  stageRef,
  onChange,
  onGuides,
}: {
  stickers: Sticker[]
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (stickers: Sticker[]) => void
  onGuides?: (g: Guides) => void
}) {
  const update = (id: string, next: Sticker) => onChange(stickers.map(s => (s.id === id ? next : s)))
  const del = (id: string) => onChange(stickers.filter(s => s.id !== id))

  return (
    <div className="stk-layer">
      {stickers.map(s => (
        <StickerItem
          key={s.id}
          s={s}
          stageRef={stageRef}
          onChange={n => update(s.id, n)}
          onDelete={() => del(s.id)}
          onGuides={onGuides}
        />
      ))}
    </div>
  )
}

// ── Freie Text-Elemente ─────────────────────────────────────────────────────
// Der Text selbst wird auf dem Canvas gezeichnet (WYSIWYG + Export). Diese Ebene
// legt pro Text-Element einen transparenten Griff-Kasten darüber: ziehen = bewegen
// (rastet mittig ein), Ecke = Größe (nsize), grüner Griff = drehen, × = löschen.

function SlideTextItem({
  t,
  rect,
  stageRef,
  onChange,
  onDelete,
  onEdit,
  onGuides,
}: {
  t: SlideText
  rect: { nx: number; ny: number; nw: number; nh: number } | undefined
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (t: SlideText) => void
  onDelete: () => void
  onEdit: () => void
  onGuides?: (g: Guides) => void
}) {
  const mode = useRef<null | 'move' | 'resize' | 'rotate'>(null)
  const start = useRef({ px: 0, py: 0, nx: 0, ny: 0, nsize: 0, cx: 0, cy: 0 })

  const begin = (e: React.PointerEvent, m: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    mode.current = m
    const r = stageRef.current?.getBoundingClientRect()
    start.current = {
      px: e.clientX,
      py: e.clientY,
      nx: t.nx,
      ny: t.ny,
      nsize: t.nsize,
      cx: r ? r.left + t.nx * r.width : e.clientX,
      cy: r ? r.top + t.ny * r.height : e.clientY,
    }
  }

  const move = (e: React.PointerEvent) => {
    if (!mode.current || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    if (mode.current === 'move') {
      let nx = clamp(start.current.nx + (e.clientX - start.current.px) / r.width, 0, 1)
      let ny = clamp(start.current.ny + (e.clientY - start.current.py) / r.height, 0, 1)
      const v = Math.abs(nx - 0.5) < SNAP
      const h = Math.abs(ny - 0.5) < SNAP
      if (v) nx = 0.5
      if (h) ny = 0.5
      onGuides?.({ v, h })
      onChange({ ...t, nx, ny })
    } else if (mode.current === 'resize') {
      onChange({ ...t, nsize: clamp(start.current.nsize + ((e.clientX - start.current.px) / r.width) * 0.9, 0.03, 0.6) })
    } else {
      const ang = (Math.atan2(e.clientY - start.current.cy, e.clientX - start.current.cx) * 180) / Math.PI + 90
      onChange({ ...t, rot: Math.round((ang % 360) + 360) % 360 })
    }
  }

  const end = (e: React.PointerEvent) => {
    mode.current = null
    onGuides?.(null)
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  // Fallback-Kasten, falls das Rechteck (noch) nicht vom Canvas geliefert wurde.
  const box = rect ?? { nx: t.nx, ny: t.ny, nw: 0.4, nh: 0.1 }
  return (
    <div
      className="txt-el"
      style={{
        left: `${box.nx * 100}%`,
        top: `${box.ny * 100}%`,
        width: `${Math.max(box.nw, 0.08) * 100}%`,
        height: `${Math.max(box.nh, 0.05) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${t.rot ?? 0}deg)`,
      }}
      onPointerDown={e => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onDoubleClick={e => { e.stopPropagation(); onEdit() }}
      title="Ziehen zum Bewegen · Doppelklick zum Bearbeiten"
    >
      <span className="txt-el-tag" style={{ fontFamily: t.font ? FONT_STACKS[t.font] : undefined }}>T</span>
      <button
        className="stk-del"
        title="Textfeld löschen"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete() }}
      >
        ×
      </button>
      <span className="stk-rotate" title="Drehen" onPointerDown={e => begin(e, 'rotate')} onPointerMove={move} onPointerUp={end} />
      <span className="stk-resize" title="Größe ziehen" onPointerDown={e => begin(e, 'resize')} onPointerMove={move} onPointerUp={end} />
    </div>
  )
}

// Verschiebe-/Skalier-Griff für das iPhone-Mockup (Gerät liegt auf dem Canvas;
// dieser Kasten liegt darüber). Ziehen = bewegen (rastet mittig ein), Ecke = Größe.
export function PhoneHandle({
  rect,
  scale,
  stageRef,
  onMove,
  onScale,
  onGuides,
}: {
  rect: { nx: number; ny: number; nw: number; nh: number }
  scale: number
  stageRef: React.RefObject<HTMLDivElement>
  onMove: (nx: number, ny: number) => void
  onScale: (scale: number) => void
  onGuides?: (g: Guides) => void
}) {
  const mode = useRef<null | 'move' | 'resize'>(null)
  const start = useRef({ px: 0, py: 0, nx: 0, ny: 0, scale: 1 })
  const begin = (e: React.PointerEvent, m: 'move' | 'resize') => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    mode.current = m
    start.current = { px: e.clientX, py: e.clientY, nx: rect.nx, ny: rect.ny, scale }
  }
  const move = (e: React.PointerEvent) => {
    if (!mode.current || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    if (mode.current === 'move') {
      let nx = clamp(start.current.nx + (e.clientX - start.current.px) / r.width, 0, 1)
      let ny = clamp(start.current.ny + (e.clientY - start.current.py) / r.height, 0, 1)
      const v = Math.abs(nx - 0.5) < SNAP
      const h = Math.abs(ny - 0.5) < SNAP
      if (v) nx = 0.5
      if (h) ny = 0.5
      onGuides?.({ v, h })
      onMove(nx, ny)
    } else {
      onScale(clamp(start.current.scale + ((e.clientX - start.current.px) / r.width) * 1.8, 0.4, 2.4))
    }
  }
  const end = (e: React.PointerEvent) => {
    mode.current = null
    onGuides?.(null)
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }
  return (
    <div
      className="phone-handle"
      style={{
        left: `${rect.nx * 100}%`,
        top: `${rect.ny * 100}%`,
        width: `${rect.nw * 100}%`,
        height: `${rect.nh * 100}%`,
      }}
      onPointerDown={e => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
    >
      <span className="txt-handle-tag">Handy</span>
      <span className="stk-resize" title="Größe ziehen" onPointerDown={e => begin(e, 'resize')} onPointerMove={move} onPointerUp={end} />
    </div>
  )
}

export function SlideTextLayer({
  texts,
  rects,
  stageRef,
  onChange,
  onEdit,
  onGuides,
}: {
  texts: SlideText[]
  rects: Record<string, { nx: number; ny: number; nw: number; nh: number }>
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (texts: SlideText[]) => void
  onEdit: (id: string) => void
  onGuides?: (g: Guides) => void
}) {
  const update = (id: string, next: SlideText) => onChange(texts.map(t => (t.id === id ? next : t)))
  const del = (id: string) => onChange(texts.filter(t => t.id !== id))
  return (
    <div className="stk-layer">
      {texts.map(t => (
        <SlideTextItem
          key={t.id}
          t={t}
          rect={rects[t.id]}
          stageRef={stageRef}
          onChange={n => update(t.id, n)}
          onDelete={() => del(t.id)}
          onEdit={() => onEdit(t.id)}
          onGuides={onGuides}
        />
      ))}
    </div>
  )
}
