import { useState } from 'react'
import { loadPlanned, removePlanned, updatePlanned } from '../lib/store'
import { CATEGORY_META } from '../lib/types'
import type { PlannedPost } from '../lib/types'
import { CopyButton } from '../components/ui'

const STATUS: { value: PlannedPost['status']; label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'planned', label: 'Geplant' },
  { value: 'published', label: 'Veröffentlicht' },
]

export default function PlannerPage() {
  const [posts, setPosts] = useState<PlannedPost[]>(loadPlanned)

  return (
    <>
      <div className="page-header">
        <h1>Planner</h1>
        <p>Alle gespeicherten Posts mit Datum und Status. Caption kopieren, Bild aus dem Generator laden, posten, abhaken.</p>
      </div>
      {posts.length === 0 ? (
        <div className="card">
          <div className="empty">Noch nichts gespeichert. Im Generator oder Mockup-Studio „In Planner speichern“ nutzen.</div>
        </div>
      ) : (
        <div className="stack">
          {posts.map(p => (
            <div className="card" key={p.id}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                {p.thumb && <img src={p.thumb} alt="" style={{ width: 96, borderRadius: 8, border: '1px solid var(--border)' }} />}
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <span className="tag dark">{p.format}</span>
                    <span className="tag">{CATEGORY_META[p.category].label}</span>
                  </div>
                  <div className="t" style={{ fontWeight: 700 }}>{p.headline}</div>
                  <div className="s" style={{ whiteSpace: 'pre-wrap', maxHeight: 66, overflow: 'hidden' }}>{p.caption.slice(0, 180)}…</div>
                </div>
                <div className="stack" style={{ gap: 8, width: 190 }}>
                  <input type="date" value={p.date} onChange={e => setPosts(updatePlanned(p.id, { date: e.target.value }))} />
                  <select value={p.status} onChange={e => setPosts(updatePlanned(p.id, { status: e.target.value as PlannedPost['status'] }))}>
                    {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div className="row" style={{ gap: 8 }}>
                    <CopyButton text={p.caption} label="Caption" />
                    <button className="btn btn-sm" onClick={() => { if (confirm('Post löschen?')) setPosts(removePlanned(p.id)) }}>Löschen</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
