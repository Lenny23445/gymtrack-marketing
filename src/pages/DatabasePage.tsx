import { useMemo, useState } from 'react'
import { IDEAS } from '../data/ideas'
import { CATEGORY_META } from '../lib/types'
import type { Category, PostFormat } from '../lib/types'
import { useSaved, KIND_META } from '../lib/savedPosts'
import type { SavedPost } from '../lib/savedPosts'
import { downloadSaved } from '../lib/render'

type Filter = 'all' | Category

export default function DatabasePage({
  onOpen,
  onEdit,
}: {
  onOpen: (ideaId: string, format?: PostFormat) => void
  onEdit: (saved: SavedPost) => void
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const { saved, remove } = useSaved()

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return IDEAS.filter(i => filter === 'all' || i.cat === filter).filter(
      i => !needle || i.title.toLowerCase().includes(needle) || i.short.toLowerCase().includes(needle),
    )
  }, [q, filter])

  const fmtDate = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <>
      <div className="page-header">
        <h1>Content-Datenbank</h1>
        <p>
          Oben: alle Posts, die du gespeichert hast — jederzeit als PNG herunterladen oder per Klick wieder öffnen und
          nachbearbeiten, ohne von vorn anzufangen. Unten: die {IDEAS.length} Kern-Ideen als Startpunkt für neue Posts.
        </p>
      </div>

      <div className="stack">
        {/* ── Gespeicherte Posts ────────────────────────────────── */}
        <div className="card">
          <h3>Meine Posts ({saved.length})</h3>
          {saved.length === 0 ? (
            <div className="empty">
              Noch nichts gespeichert. Erstelle einen Post in „Instagram Post", „TikTok Slides" oder „Mockup-Studio" und
              klick dort auf „In Datenbank speichern".
            </div>
          ) : (
            <div className="saved-grid">
              {saved.map(s => (
                <div className="saved-tile" key={s.id}>
                  {s.thumb ? (
                    <img className="saved-thumb" src={s.thumb} alt="" />
                  ) : (
                    <div className="saved-thumb saved-thumb-empty" />
                  )}
                  <div className="saved-body">
                    <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                      <span className="tag dark">{KIND_META[s.kind].label}</span>
                      <span className="tag">{CATEGORY_META[s.category].label}</span>
                    </div>
                    <div className="t" style={{ fontWeight: 700 }}>{s.title}</div>
                    <div className="s">Gespeichert {fmtDate(s.updatedAt)}</div>
                    <div className="row" style={{ gap: 6, marginTop: 10 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => onEdit(s)}>Bearbeiten</button>
                      <button className="btn btn-sm" onClick={() => downloadSaved(s)}>PNG</button>
                      <button
                        className="btn btn-sm"
                        onClick={() => { if (confirm('Post wirklich löschen?')) remove(s.id) }}
                        title="Löschen"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Ideen-Datenbank ───────────────────────────────────── */}
        <div className="card">
          <div className="row">
            <div style={{ flex: 1, minWidth: 220 }}>
              <input type="text" placeholder="Ideen durchsuchen …" value={q} onChange={e => setQ(e.target.value)} />
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
          <h3>Ideen ({list.length})</h3>
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
