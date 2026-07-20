import { useState } from 'react'
import type { JSX } from 'react'
import type { PostFormat } from './lib/types'
import type { SavedPost } from './lib/savedPosts'
import GeneratorPage from './pages/GeneratorPage'
import DatabasePage from './pages/DatabasePage'
import MockupPage from './pages/MockupPage'
import TikTokPage from './pages/TikTokPage'

type Page = 'generator' | 'tiktok' | 'mockup' | 'database'

export interface GeneratorRequest {
  ideaId: string
  format?: PostFormat
  nonce: number
}

// Anfrage, einen gespeicherten Post im passenden Generator zum Nachbearbeiten zu öffnen.
export interface EditRequest {
  saved: SavedPost
  nonce: number
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

// TikTok Slides zuerst — das ist das Kern-Werkzeug und die Start-Ansicht.
const NAV: { id: Page; label: string; icon: JSX.Element }[] = [
  { id: 'tiktok', label: 'TikTok Slides', icon: icon('M4 4h6v10a4 4 0 1 1-4-4M14 3v5a5 5 0 0 0 5 5') },
  { id: 'generator', label: 'Instagram Post', icon: icon('M12 3v18M3 12h18') },
  { id: 'mockup', label: 'Mockup-Studio', icon: icon('M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 19h2') },
  { id: 'database', label: 'Content-Datenbank', icon: icon('M4 6h16M4 12h16M4 18h16') },
]

export default function App() {
  const [page, setPage] = useState<Page>('tiktok')
  // Seitenleiste einklappbar → mehr Platz zum Bearbeiten (schmale Icon-Leiste).
  const [collapsed, setCollapsed] = useState(false)
  const [request, setRequest] = useState<GeneratorRequest | null>(null)
  const [edit, setEdit] = useState<EditRequest | null>(null)

  // Aus der Datenbank: eine Idee frisch im Post-Generator öffnen.
  const openInGenerator = (ideaId: string, format?: PostFormat) => {
    setRequest({ ideaId, format, nonce: Date.now() })
    setPage('generator')
  }

  // Aus der Datenbank: gespeicherten Post im richtigen Generator nachbearbeiten.
  const openEdit = (saved: SavedPost) => {
    setEdit({ saved, nonce: Date.now() })
    setPage(saved.kind === 'tiktok' ? 'tiktok' : saved.kind === 'mockup' ? 'mockup' : 'generator')
  }

  const editFor = (kind: SavedPost['kind']) => (edit && edit.saved.kind === kind ? edit : null)

  return (
    <div className="app">
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="brand">
          <div className="brand-mark">GT</div>
          {!collapsed && (
            <div>
              <div className="brand-name">My Gym Track</div>
              <div className="brand-sub">Content Studio</div>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Menü ausklappen' : 'Menü einklappen'}
            aria-label="Menü ein- oder ausklappen"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        {NAV.map(n => (
          <button
            key={n.id}
            className={'nav-item' + (page === n.id ? ' active' : '')}
            onClick={() => setPage(n.id)}
            title={n.label}
          >
            {n.icon}
            {!collapsed && n.label}
          </button>
        ))}
        {!collapsed && <div className="sidebar-footer">Internes Marketing-Tool · v1.0</div>}
      </aside>
      <main className="main">
        {page === 'generator' && <GeneratorPage request={request} edit={editFor('ig')} />}
        {page === 'tiktok' && <TikTokPage edit={editFor('tiktok')} />}
        {page === 'mockup' && <MockupPage edit={editFor('mockup')} />}
        {page === 'database' && <DatabasePage onOpen={openInGenerator} onEdit={openEdit} />}
      </main>
    </div>
  )
}
