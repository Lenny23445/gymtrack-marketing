import { useState } from 'react'
import { CATEGORY_META } from '../lib/types'
import type { Category, ReelConcept } from '../lib/types'
import { randomIdea } from '../data/ideas'
import { generateReel } from '../data/reels'
import { hashtagBlock } from '../lib/generator'
import { CopyButton, Seg } from '../components/ui'

const CATS = (Object.keys(CATEGORY_META) as Category[]).map(c => ({ value: c, label: CATEGORY_META[c].label }))

function reelAsText(r: ReelConcept): string {
  return [
    'REEL: ' + r.title,
    'Cover-Text: ' + r.coverText,
    'Audio: ' + r.audio,
    '',
    ...r.scenes.map(s => `${s.time} — TEXT: "${s.text}"\n   SZENE: ${s.scene}`),
    '',
    'CAPTION:',
    r.caption,
    '',
    hashtagBlock(r.hashtags),
  ].join('\n')
}

export default function ReelsPage() {
  const [cat, setCat] = useState<Category>('problem')
  const [reel, setReel] = useState<ReelConcept>(() => generateReel(randomIdea('problem')))

  const regen = (c: Category = cat) => setReel(generateReel(randomIdea(c)))

  return (
    <>
      <div className="page-header">
        <h1>Instagram Reel</h1>
        <p>Fertige Drehbücher mit Timing, On-Screen-Text, Szenenbeschreibung und Audio-Empfehlung — 15-Sekunden-Format, optimiert auf Hook in den ersten 3 Sekunden.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Seg options={CATS} value={cat} onChange={c => { setCat(c); regen(c) }} />
            <button className="btn btn-primary" onClick={() => regen()}>Neues Konzept</button>
          </div>
        </div>
        <div className="card">
          <h3>Konzept</h3>
          <div className="t" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>{reel.title}</div>
          <p className="hint" style={{ marginBottom: 16 }}>Cover-Text: „{reel.coverText}“ · Audio: {reel.audio}</p>
          <table className="plain">
            <thead>
              <tr><th style={{ width: 90 }}>Timing</th><th style={{ width: '38%' }}>Text im Video</th><th>Szene</th></tr>
            </thead>
            <tbody>
              {reel.scenes.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.time}</td>
                  <td style={{ fontWeight: 600 }}>{s.text}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.scene}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>Caption</h3>
            <div className="mono-block">{reel.caption}</div>
          </div>
          <div className="card">
            <h3>Hashtags</h3>
            <div className="mono-block">{hashtagBlock(reel.hashtags)}</div>
          </div>
        </div>
        <div className="row">
          <CopyButton text={reelAsText(reel)} label="Komplettes Konzept kopieren" primary />
          <CopyButton text={reel.caption + '\n\n' + hashtagBlock(reel.hashtags)} label="Caption + Hashtags" />
        </div>
      </div>
    </>
  )
}
