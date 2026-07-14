import { useState } from 'react'
import type { Score } from '../lib/types'

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
