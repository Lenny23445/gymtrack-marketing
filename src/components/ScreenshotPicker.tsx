import { useEffect, useState } from 'react'
import { loadImage, useShots } from '../lib/screenshots'

// Geteilter Picker: laedt/verwaltet die Screenshot-Bibliothek und liefert das
// gewaehlte Bild als HTMLImageElement zum Zeichnen auf Canvas.
// Upload per Button oder ⌘V. Auswahl togglt (nochmal klicken = abwaehlen).
export function ScreenshotPicker({
  selectedId,
  onSelect,
  hint,
}: {
  selectedId: string | null
  onSelect: (img: HTMLImageElement | null, id: string | null) => void
  hint?: string
}) {
  const { shots, add, remove } = useShots()
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file?: File) => {
    if (!file) return
    setErr(null)
    setBusy(true)
    try {
      const s = await add(file)
      onSelect(await loadImage(s.dataUrl), s.id)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ⌘V: Screenshot direkt aus der Zwischenablage in die Bibliothek
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0]
      if (file) upload(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = async (id: string, dataUrl: string) => {
    if (id === selectedId) {
      onSelect(null, null)
      return
    }
    try {
      onSelect(await loadImage(dataUrl), id)
    } catch {
      setErr('Bild konnte nicht geladen werden.')
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
          {busy ? 'Lädt…' : '+ Screenshot hochladen'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
        </label>
        <span className="hint">{hint ?? 'Bleibt gespeichert, überall abrufbar. Auch mit ⌘V einfügbar.'}</span>
      </div>
      {err && <p className="hint" style={{ color: '#b3261e', marginBottom: 8 }}>{err}</p>}
      {shots.length === 0 ? (
        <p className="hint">Noch keine Screenshots in der Bibliothek. Lade welche hoch — sie stehen dann hier und im Post-Generator, in TikTok Slides und im Mockup-Studio bereit.</p>
      ) : (
        <div className="shot-grid">
          {shots.map(s => (
            <div key={s.id} className={'shot-tile' + (s.id === selectedId ? ' on' : '')} onClick={() => choose(s.id, s.dataUrl)} title={s.name}>
              <img src={s.dataUrl} alt={s.name} />
              <button
                className="shot-del"
                title="Löschen"
                onClick={e => {
                  e.stopPropagation()
                  remove(s.id)
                  if (s.id === selectedId) onSelect(null, null)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
