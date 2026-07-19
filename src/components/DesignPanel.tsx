import { useState } from 'react'
import { FONTS, EFFECTS } from '../lib/fonts'
import type { TextStyle } from '../lib/fonts'
import type { SlideBg } from '../lib/types'
import { compressDataUrl } from '../lib/screenshots'
import { AccentPicker } from './ui'

// Aufgeräumtes Design-Panel: dicke, aufklappbare Felder. Immer nur eins offen
// (Akkordeon) → clean. Schriftart · Effekt · Highlight · Hintergrund · Sticker.

// Fertige Farbverläufe zum Antippen.
const GRADIENTS: { from: string; to: string; angle: number }[] = [
  { from: '#0A84FF', to: '#5E5CE6', angle: 135 },
  { from: '#FF375F', to: '#FF9F0A', angle: 135 },
  { from: '#30D158', to: '#40C8E0', angle: 135 },
  { from: '#BF5AF2', to: '#FF375F', angle: 135 },
  { from: '#FFD60A', to: '#FF9F0A', angle: 135 },
  { from: '#5E5CE6', to: '#40C8E0', angle: 160 },
  { from: '#1C1C1E', to: '#3A3A3C', angle: 135 },
  { from: '#000000', to: '#434343', angle: 135 },
]

const bgCss = (bg: SlideBg | undefined): string => {
  if (!bg || bg.type === 'theme') return 'var(--border)'
  if (bg.type === 'solid') return bg.color
  if (bg.type === 'gradient') return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`
  return '#888'
}

const bgLabel = (bg: SlideBg | undefined): string => {
  if (!bg || bg.type === 'theme') return 'Standard'
  if (bg.type === 'solid') return 'Vollton'
  if (bg.type === 'gradient') return 'Verlauf'
  return 'Eigenes Bild'
}

function Row({
  id,
  label,
  value,
  swatch,
  open,
  setOpen,
  children,
}: {
  id: string
  label: string
  value?: string
  swatch?: string
  open: string | null
  setOpen: (v: string | null) => void
  children: React.ReactNode
}) {
  const isOpen = open === id
  return (
    <div className={'dp-row' + (isOpen ? ' open' : '')}>
      <button type="button" className="dp-head" onClick={() => setOpen(isOpen ? null : id)}>
        <span className="dp-label">{label}</span>
        <span className="dp-value">
          {swatch !== undefined && <span className="dp-swatch" style={{ background: swatch }} />}
          {value}
          <span className="dp-chev">{isOpen ? '⌄' : '›'}</span>
        </span>
      </button>
      {isOpen && <div className="dp-body">{children}</div>}
    </div>
  )
}

export function DesignPanel({
  style,
  onStyle,
  accent,
  onAccent,
  bg,
  onBg,
  onImportSticker,
  stickerCount,
}: {
  style: TextStyle
  onStyle: (s: TextStyle) => void
  accent: string
  onAccent: (c: string) => void
  bg: SlideBg | undefined
  onBg: (b: SlideBg) => void
  onImportSticker: (file?: File) => void
  stickerCount: number
}) {
  const [open, setOpen] = useState<string | null>(null)
  const fontLabel = FONTS.find(f => f.key === style.font)?.label ?? 'Standard'
  const effectLabel = EFFECTS.find(e => e.key === style.effect)?.label ?? 'Kein'

  const onBgImage = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = async () => {
      const dataUrl = await compressDataUrl(r.result as string, 1290)
      onBg({ type: 'image', dataUrl })
    }
    r.readAsDataURL(file)
  }

  return (
    <div className="design-panel">
      <Row id="font" label="Schriftart" value={fontLabel} open={open} setOpen={setOpen}>
        <div className="dp-chips">
          {FONTS.map(f => (
            <button
              key={f.key}
              type="button"
              className={'font-chip' + (style.font === f.key ? ' on' : '')}
              style={{ fontFamily: f.stack }}
              onClick={() => onStyle({ ...style, font: f.key })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Row>

      <Row id="effect" label="Effekt" value={effectLabel} open={open} setOpen={setOpen}>
        <div className="dp-chips">
          {EFFECTS.map(e => (
            <button
              key={e.key}
              type="button"
              className={'font-chip' + (style.effect === e.key ? ' on' : '')}
              onClick={() => onStyle({ ...style, effect: e.key })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </Row>

      <Row id="accent" label="Highlight-Farbe" swatch={accent} value="" open={open} setOpen={setOpen}>
        <AccentPicker value={accent} onChange={onAccent} />
      </Row>

      <Row id="bg" label="Hintergrund" value={bgLabel(bg)} swatch={bgCss(bg)} open={open} setOpen={setOpen}>
        <div className="dp-bg">
          <div className="dp-chips" style={{ marginBottom: 10 }}>
            <button type="button" className={'font-chip' + (!bg || bg.type === 'theme' ? ' on' : '')} onClick={() => onBg({ type: 'theme' })}>
              Standard
            </button>
            <label className={'font-chip' + (bg?.type === 'solid' ? ' on' : '')} style={{ cursor: 'pointer', position: 'relative' }}>
              Vollton
              <input
                type="color"
                style={{ width: 0, height: 0, opacity: 0, position: 'absolute', left: 0, bottom: 0 }}
                value={bg?.type === 'solid' ? bg.color : '#0A0A0A'}
                onChange={e => onBg({ type: 'solid', color: e.target.value.toUpperCase() })}
              />
            </label>
            <label className={'font-chip' + (bg?.type === 'image' ? ' on' : '')} style={{ cursor: 'pointer' }}>
              Eigenes Bild
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  onBgImage(e.target.files?.[0])
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>
          <span className="hint">Farbverlauf:</span>
          <div className="dp-grads">
            {GRADIENTS.map((g, i) => {
              const active = bg?.type === 'gradient' && bg.from === g.from && bg.to === g.to
              return (
                <button
                  key={i}
                  type="button"
                  className={'dp-grad' + (active ? ' on' : '')}
                  style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                  onClick={() => onBg({ type: 'gradient', ...g })}
                />
              )
            })}
          </div>
        </div>
      </Row>

      <Row id="sticker" label="Sticker" value={stickerCount > 0 ? `${stickerCount} platziert` : 'importieren'} open={open} setOpen={setOpen}>
        <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
          + Sticker importieren
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              onImportSticker(e.target.files?.[0])
              e.currentTarget.value = ''
            }}
          />
        </label>
        <p className="hint" style={{ marginTop: 8 }}>
          Erscheint im Preview — dort frei ziehen, Ecke = Größe, × löscht.
        </p>
      </Row>
    </div>
  )
}
