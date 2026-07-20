import { useRef } from 'react'
import type { Sticker } from '../lib/types'

// Interaktive Sticker-Ebene ÜBER dem Vorschau-Canvas. Jeder Sticker ist per Maus/
// Touch frei verschiebbar (ziehen) und in der Ecke skalierbar; × löscht ihn.
// Positionen sind Anteile (0..1) der Bühne → passen 1:1 zum Canvas-Export.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function StickerItem({
  s,
  stageRef,
  onChange,
  onDelete,
}: {
  s: Sticker
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (s: Sticker) => void
  onDelete: () => void
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
      onChange({
        ...s,
        nx: clamp(start.current.nx + (e.clientX - start.current.px) / r.width, 0, 1),
        ny: clamp(start.current.ny + (e.clientY - start.current.py) / r.height, 0, 1),
      })
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
  const SNAP = 0.025 // Faengt bei ~2,5 % Abstand zur Mitte auf 0,5 ein
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
}: {
  stickers: Sticker[]
  stageRef: React.RefObject<HTMLDivElement>
  onChange: (stickers: Sticker[]) => void
}) {
  const update = (id: string, next: Sticker) => onChange(stickers.map(s => (s.id === id ? next : s)))
  const del = (id: string) => onChange(stickers.filter(s => s.id !== id))

  return (
    <div className="stk-layer">
      {stickers.map(s => (
        <StickerItem key={s.id} s={s} stageRef={stageRef} onChange={n => update(s.id, n)} onDelete={() => del(s.id)} />
      ))}
    </div>
  )
}
