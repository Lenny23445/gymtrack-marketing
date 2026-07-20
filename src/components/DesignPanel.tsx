import { useEffect, useState } from 'react'
import { FONTS, EFFECTS } from '../lib/fonts'
import type { TextStyle } from '../lib/fonts'
import type { SlideBg } from '../lib/types'
import { compressDataUrl } from '../lib/screenshots'
import { AccentPicker } from './ui'

// Flaches Design-Panel: ALLE Werkzeuge gleichzeitig sichtbar (kein Akkordeon mehr) —
// Schriftart · Effekt · Highlight-Farbe · Hintergrund · Sticker. So hat man auf iPad
// und MacBook alles auf einen Blick.

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

const DEF_GRAD = { from: '#0A84FF', to: '#BF5AF2', angle: 135, mid: 0.5 }

const gradCss = (from: string, to: string, angle: number, mid = 0.5): string => {
  const m = Math.max(2, Math.min(98, mid * 100))
  return `linear-gradient(${angle}deg, ${from} ${Math.max(0, m - 50)}%, ${to} ${Math.min(100, m + 50)}%)`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dp-sec">
      <div className="dp-sec-title">{title}</div>
      {children}
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
  // Lokaler Zustand des Verlauf-Bauklotzes; synchronisiert, wenn ein Gradient aktiv ist.
  const [grad, setGrad] = useState(DEF_GRAD)
  useEffect(() => {
    if (bg?.type === 'gradient') setGrad({ from: bg.from, to: bg.to, angle: bg.angle, mid: bg.mid ?? 0.5 })
  }, [bg])

  const applyGrad = (patch: Partial<typeof grad>) => {
    const g = { ...grad, ...patch }
    setGrad(g)
    onBg({ type: 'gradient', ...g })
  }

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
    <div className="design-panel-flat">
      <Section title="Schriftart">
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
      </Section>

      <Section title="Effekt">
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
      </Section>

      <Section title="Highlight-Farbe (Standard)">
        <AccentPicker value={accent} onChange={onAccent} />
      </Section>

      <Section title="Hintergrund">
        <div className="dp-chips" style={{ marginBottom: 12 }}>
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

        <span className="hint">Fertige Verläufe:</span>
        <div className="dp-grads">
          {GRADIENTS.map((g, i) => {
            const active = bg?.type === 'gradient' && bg.from === g.from && bg.to === g.to
            return (
              <button
                key={i}
                type="button"
                className={'dp-grad' + (active ? ' on' : '')}
                style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                onClick={() => onBg({ type: 'gradient', ...g, mid: 0.5 })}
              />
            )
          })}
        </div>

        <div className="dp-grad-builder">
          <div className="dp-gb-head">
            <span className="hint">Eigener Verlauf</span>
            <span className="dp-gb-preview" style={{ background: gradCss(grad.from, grad.to, grad.angle, grad.mid) }} />
          </div>
          <div className="dp-gb-colors">
            <label className="dp-gb-color">
              <span className="dp-gb-sw" style={{ background: grad.from }} />
              Farbe A
              <input type="color" value={grad.from} onChange={e => applyGrad({ from: e.target.value.toUpperCase() })} />
            </label>
            <label className="dp-gb-color">
              <span className="dp-gb-sw" style={{ background: grad.to }} />
              Farbe B
              <input type="color" value={grad.to} onChange={e => applyGrad({ to: e.target.value.toUpperCase() })} />
            </label>
          </div>
          <label className="dp-slider">
            <span>Winkel <b>{grad.angle}°</b></span>
            <input type="range" min={0} max={360} value={grad.angle} onChange={e => applyGrad({ angle: Number(e.target.value) })} />
          </label>
          <label className="dp-slider">
            <span>Mischung <b>{Math.round(grad.mid * 100)}%</b></span>
            <input type="range" min={5} max={95} value={Math.round(grad.mid * 100)} onChange={e => applyGrad({ mid: Number(e.target.value) / 100 })} />
          </label>
        </div>
      </Section>

      <Section title="Sticker">
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
        <span className="hint" style={{ marginLeft: 10 }}>
          {stickerCount > 0 ? `${stickerCount} platziert` : 'Im Preview frei ziehen · Ecke = Größe · × löscht'}
        </span>
      </Section>
    </div>
  )
}
