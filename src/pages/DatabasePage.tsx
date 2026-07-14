import { useMemo, useState } from 'react'
import { IDEAS } from '../data/ideas'
import { CATEGORY_META } from '../lib/types'
import type { Category, PostFormat } from '../lib/types'

type Filter = 'all' | Category

export default function DatabasePage({ onOpen }: { onOpen: (ideaId: string, format?: PostFormat) => void }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return IDEAS.filter(i => (filter === 'all' || i.cat === filter))
      .filter(i => !needle || i.title.toLowerCase().includes(needle) || i.short.toLowerCase().includes(needle))
  }, [q, filter])

  return (
    <>
      <div className="page-header">
        <h1>Content-Datenbank</h1>
        <p>{IDEAS.length} Kern-Ideen in 6 Kategorien. Jede Idee lässt sich direkt als Single Post oder Carousel generieren — der Generator variiert Hooks, CTAs und Fragen automatisch.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row">
            <div style={{ flex: 1, minWidth: 220 }}>
              <input type="text" placeholder="Suchen …" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="seg">
              <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Alle</button>
              {(Object.keys(CATEGORY_META) as Category[]).map(c => (
                <button key={c} className={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <h3>{list.length} Einträge</h3>
          {list.map(i => (
            <div className="idea-row" key={i.id}>
              <div>
                <span className="tag" style={{ marginBottom: 6 }}>{CATEGORY_META[i.cat].label}</span>
                <div className="t">{i.title}</div>
                <div className="s">{i.short}</div>
              </div>
              <div className="row" style={{ flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => onOpen(i.id, 'single')}>Single</button>
                <button className="btn btn-sm" onClick={() => onOpen(i.id, 'carousel')}>Carousel</button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="empty">Keine Treffer.</div>}
        </div>
      </div>
    </>
  )
}
