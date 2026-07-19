import { useEffect, useState } from 'react'
import type { Score } from '../lib/types'
import { FONTS, EFFECTS } from '../lib/fonts'
import type { TextStyle } from '../lib/fonts'

// Schrift- + Effekt-Wähler. Jeder Schrift-Chip zeigt seine eigene Schriftart als
// Live-Vorschau. Effekte: Kontur, Schatten, Neon, Sticker/Bubble, 3D.
export function StylePicker({ style, onChange }: { style: TextStyle; onChange: (s: TextStyle) => void }) {
  return (
    <div className="style-picker">
      <div className="style-row">
        <span className="hint">Schrift:</span>
        {FONTS.map(f => (
          <button
            key={f.key}
            type="button"
            className={'font-chip' + (style.font === f.key ? ' on' : '')}
            style={{ fontFamily: f.stack }}
            onClick={() => onChange({ ...style, font: f.key })}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="style-row">
        <span className="hint">Effekt:</span>
        {EFFECTS.map(e => (
          <button
            key={e.key}
            type="button"
            className={'font-chip' + (style.effect === e.key ? ' on' : '')}
            onClick={() => onChange({ ...style, effect: e.key })}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={'btn btn-sm' + (primary ? ' btn-primary' : '')}
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      {copied ? '✓ Kopiert' : label}
    </button>
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Schnellzugriff-Presets. Der eigentliche „alle Farben"-Wähler ist der native
// Color-Picker + das Hex-Feld daneben — jede beliebige Farbe ist wählbar.
const ACCENTS: { label: string; value: string }[] = [
  { label: 'Blau', value: '#0A84FF' },
  { label: 'Hellblau', value: '#64D2FF' },
  { label: 'Türkis', value: '#40C8E0' },
  { label: 'Grün', value: '#30D158' },
  { label: 'Mint', value: '#66D4CF' },
  { label: 'Gelb', value: '#FFD60A' },
  { label: 'Orange', value: '#FF9F0A' },
  { label: 'Rot', value: '#FF453A' },
  { label: 'Pink', value: '#FF375F' },
  { label: 'Violett', value: '#BF5AF2' },
  { label: 'Indigo', value: '#5E5CE6' },
  { label: 'Braun', value: '#AC8E68' },
  { label: 'Grau', value: '#8E8E93' },
  { label: 'Weiß', value: '#FFFFFF' },
  { label: 'Schwarz', value: '#0A0A0A' },
]

// Akzeptiert #rgb / #rrggbb (mit/ohne #) und liefert normalisiertes #RRGGBB oder null.
function normalizeHex(v: string): string | null {
  let s = v.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(s) ? '#' + s.toUpperCase() : null
}

// Wählt die Highlight-Farbe für Passagen, die im Text mit *Sternchen* markiert sind.
// Presets für den schnellen Griff + voller Farbraum über den nativen Picker und ein
// Hex-Feld für exakte Werte (z. B. Markenfarbe).
export function AccentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value)
  // Externe Änderungen (Preset-Klick, Re-Edit eines Posts) ins Hex-Feld spiegeln.
  useEffect(() => setHex(value), [value])

  const onHexInput = (v: string) => {
    setHex(v)
    const n = normalizeHex(v)
    if (n) onChange(n)
  }

  return (
    <div className="accent-picker">
      <span className="hint">Highlight-Farbe:</span>
      <div className="accent-dots">
        {ACCENTS.map(a => (
          <button
            key={a.value}
            type="button"
            className={'accent-dot' + (value.toLowerCase() === a.value.toLowerCase() ? ' on' : '')}
            style={{ background: a.value }}
            title={a.label}
            onClick={() => onChange(a.value)}
          />
        ))}
        <label className="accent-custom" title="Alle Farben — eigene wählen">
          <span className="accent-custom-plus">＋</span>
          <input type="color" value={normalizeHex(value) ?? '#0A84FF'} onChange={e => onChange(e.target.value.toUpperCase())} />
        </label>
      </div>
      <span className="accent-hex">
        <span className="accent-hex-swatch" style={{ background: normalizeHex(hex) ?? value }} />
        <input
          type="text"
          className="accent-hex-input"
          value={hex}
          onChange={e => onHexInput(e.target.value)}
          spellCheck={false}
          maxLength={7}
          aria-label="Hex-Farbwert"
        />
      </span>
      <span className="hint">Passage im Text mit *Sternchen* markieren</span>
    </div>
  )
}

export function ScoreCard({ score }: { score: Score }) {
  return (
    <div className="card">
      <h3>Qualitätsbewertung</h3>
      <div className="row" style={{ alignItems: 'baseline', marginBottom: 18 }}>
        <span className="score-total">{score.total}</span>
        <span className="hint">/ 100</span>
      </div>
      {score.axes.map(a => (
        <div className="score-axis" key={a.label}>
          <span>{a.label}</span>
          <span className="bar">
            <i style={{ width: a.value + '%' }} />
          </span>
          <span className="num">{a.value}</span>
        </div>
      ))}
      <h3 style={{ marginTop: 18 }}>Verbesserungen</h3>
      <ul className="suggestions">
        {score.suggestions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  )
}
