import { useState } from 'react'
import { CATEGORY_META } from '../lib/types'
import type { CalendarEntry, Category, PostFormat } from '../lib/types'
import { ideasByCategory } from '../data/ideas'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

// Wochenrhythmus nach Vorgabe: Mo Education, Di App-Feature, Mi Fitness Fact,
// Do Carousel-Deep-Dive, Fr Motivation, Sa Community, So Progress/Vergleich
const SLOTS: Record<number, { cat: Category; label: string; format: PostFormat }> = {
  1: { cat: 'education', label: 'Educational Post', format: 'single' },
  2: { cat: 'feature', label: 'App-Feature', format: 'single' },
  3: { cat: 'education', label: 'Fitness Fact', format: 'single' },
  4: { cat: 'problem', label: 'Carousel Deep-Dive', format: 'carousel' },
  5: { cat: 'motivation', label: 'Motivation', format: 'single' },
  6: { cat: 'community', label: 'Community', format: 'single' },
  0: { cat: 'comparison', label: 'Progress-Thema', format: 'single' },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPlan(month: string): CalendarEntry[] {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const queues = new Map<Category, { pool: string[]; titles: Map<string, string> }>()
  const next = (cat: Category) => {
    if (!queues.has(cat)) {
      const ideas = ideasByCategory(cat)
      queues.set(cat, { pool: shuffle(ideas.map(i => i.id)), titles: new Map(ideas.map(i => [i.id, i.title])) })
    }
    const q = queues.get(cat)!
    if (q.pool.length === 0) q.pool = shuffle([...q.titles.keys()])
    return q.pool.pop()!
  }
  const entries: CalendarEntry[] = []
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m - 1, d)
    const slot = SLOTS[date.getDay()]
    const ideaId = next(slot.cat)
    entries.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      weekday: WEEKDAYS[date.getDay()],
      slotLabel: slot.label,
      format: slot.format,
      ideaId,
      ideaTitle: queues.get(slot.cat)!.titles.get(ideaId)!,
      category: slot.cat,
    })
  }
  return entries
}

export default function CalendarPage({ onOpen }: { onOpen: (ideaId: string, format?: PostFormat) => void }) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [plan, setPlan] = useState<CalendarEntry[]>(() => buildPlan(defaultMonth))

  const exportCsv = () => {
    const rows = [['Datum', 'Wochentag', 'Slot', 'Format', 'Kategorie', 'Thema'].join(';')]
    plan.forEach(e => rows.push([e.date, e.weekday, e.slotLabel, e.format, CATEGORY_META[e.category].label, '"' + e.ideaTitle + '"'].join(';')))
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `content-plan-${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="page-header">
        <h1>Content-Kalender</h1>
        <p>Automatischer Monatsplan nach festem Wochenrhythmus. Jeder Tag bekommt ein Thema aus der Datenbank — ohne Wiederholungen, solange der Pool reicht.</p>
      </div>
      <div className="stack">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              <div style={{ width: 180 }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => setPlan(buildPlan(month))}>Plan generieren</button>
            </div>
            <button className="btn" onClick={exportCsv}>CSV exportieren</button>
          </div>
        </div>
        <div className="card">
          <h3>{plan.length} Posts geplant</h3>
          <table className="plain">
            <thead>
              <tr><th style={{ width: 110 }}>Datum</th><th style={{ width: 110 }}>Tag</th><th style={{ width: 160 }}>Slot</th><th>Thema</th><th style={{ width: 110 }}></th></tr>
            </thead>
            <tbody>
              {plan.map(e => (
                <tr key={e.date}>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{e.date.slice(8)}.{e.date.slice(5, 7)}.</td>
                  <td>{e.weekday}</td>
                  <td><span className="tag">{e.slotLabel}</span></td>
                  <td style={{ fontWeight: 600 }}>{e.ideaTitle}</td>
                  <td><button className="btn btn-sm" onClick={() => onOpen(e.ideaId, e.format)}>→ Generator</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
