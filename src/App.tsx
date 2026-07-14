import { useState } from 'react'
import type { JSX } from 'react'
import type { PostFormat } from './lib/types'
import GeneratorPage from './pages/GeneratorPage'
import DatabasePage from './pages/DatabasePage'
import MockupPage from './pages/MockupPage'
import ReelsPage from './pages/ReelsPage'
import TikTokPage from './pages/TikTokPage'
import CalendarPage from './pages/CalendarPage'
import PlannerPage from './pages/PlannerPage'
import StrategyPage from './pages/StrategyPage'

type Page = 'generator' | 'database' | 'mockup' | 'reels' | 'tiktok' | 'calendar' | 'planner' | 'strategy'

export interface GeneratorRequest {
  ideaId: string
  format?: PostFormat
  nonce: number
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const NAV: { id: Page; label: string; icon: JSX.Element }[] = [
  { id: 'generator', label: 'Instagram Post', icon: icon('M12 3v18M3 12h18') },
  { id: 'reels', label: 'Instagram Reel', icon: icon('M5 3l14 9-14 9V3z') },
  { id: 'tiktok', label: 'TikTok Slides', icon: icon('M4 4h6v10a4 4 0 1 1-4-4M14 3v5a5 5 0 0 0 5 5') },
  { id: 'database', label: 'Content-Datenbank', icon: icon('M4 6h16M4 12h16M4 18h16') },
  { id: 'mockup', label: 'Mockup-Studio', icon: icon('M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 19h2') },
  { id: 'calendar', label: 'Content-Kalender', icon: icon('M3 5h18v16H3zM3 9h18M8 3v4M16 3v4') },
  { id: 'planner', label: 'Planner', icon: icon('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11') },
  { id: 'strategy', label: 'Strategie', icon: icon('M3 17l6-6 4 4 8-8M21 7v6h-6') },
]

export default function App() {
  const [page, setPage] = useState<Page>('generator')
  const [request, setRequest] = useState<GeneratorRequest | null>(null)

  const openInGenerator = (ideaId: string, format?: PostFormat) => {
    setRequest({ ideaId, format, nonce: Date.now() })
    setPage('generator')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GT</div>
          <div>
            <div className="brand-name">My Gym Track</div>
            <div className="brand-sub">Content Studio</div>
          </div>
        </div>
        {NAV.map(n => (
          <button key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)}>
            {n.icon}
            {n.label}
          </button>
        ))}
        <div className="sidebar-footer">Internes Marketing-Tool · v1.0</div>
      </aside>
      <main className="main">
        {page === 'generator' && <GeneratorPage request={request} />}
        {page === 'database' && <DatabasePage onOpen={openInGenerator} />}
        {page === 'mockup' && <MockupPage />}
        {page === 'reels' && <ReelsPage />}
        {page === 'tiktok' && <TikTokPage />}
        {page === 'calendar' && <CalendarPage onOpen={openInGenerator} />}
        {page === 'planner' && <PlannerPage />}
        {page === 'strategy' && <StrategyPage />}
      </main>
    </div>
  )
}
