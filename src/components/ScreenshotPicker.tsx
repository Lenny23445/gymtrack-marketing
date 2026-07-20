import { useEffect, useState } from 'react'
import { loadImage, useShots } from '../lib/screenshots'
import type { Shot } from '../lib/screenshots'

// Geteilter Picker: laedt/verwaltet die Screenshot-Bibliothek und liefert das
// gewaehlte Bild als HTMLImageElement zum Zeichnen auf Canvas.
// Upload per Button (mehrere waehlbar), ⌘V oder Drag & Drop (auch mehrere auf einmal).
// Auswahl togglt (nochmal klicken = abwaehlen).
// library: optional eine bereits geladene Bibliothek von aussen reinreichen,
// damit mehrere Picker auf derselben Seite denselben Stand teilen (z. B. TikTok:
// pro Slide ein eigenes Bild). Ohne library nutzt der Picker seinen eigenen Hook.
export function ScreenshotPicker({
  selectedId,
  onSelect,
  hint,
  library,
}: {
  selectedId: string | null
  onSelect: (img: HTMLImageElement | null, id: string | null) => void
  hint?: string
  library?: { shots: Shot[]; add: (file: File) => Promise<Shot>; remove: (id: string) => Promise<void> }
}) {
  const own = useShots()
  const { shots, add, remove } = library ?? own
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)

  // Ein oder mehrere Bilder in die Bibliothek laden; das zuletzt hinzugefuegte wird
  // ausgewaehlt (beim TikTok-Picker also dem aktiven Slide zugewiesen).
  const uploadFiles = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    setErr(null)
    setBusy(true)
    try {
      let last: Shot | null = null
      for (const f of imgs) last = await add(f)
      if (last) onSelect(await loadImage(last.dataUrl), last.id)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ⌘V: Screenshot(s) direkt aus der Zwischenablage in die Bibliothek
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (files && files.length) uploadFiles([...files])
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const files = e.dataTransfer?.files
    if (files && files.length) uploadFiles([...files])
  }

  return (
    <div
      className={'dropzone' + (drag ? ' drag' : '')}
      onDragOver={e => {
        e.preventDefault()
        if (!drag) setDrag(true)
      }}
      onDragLeave={e => {
        e.preventDefault()
        setDrag(false)
      }}
      onDrop={onDrop}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
          {busy ? 'Lädt…' : '+ Screenshots hochladen'}
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              uploadFiles([...(e.target.files ?? [])])
              e.currentTarget.value = ''
            }}
          />
        </label>
        <span className="hint">{hint ?? 'Mehrere per Drag & Drop hierher ziehen, per Button wählen oder mit ⌘V einfügen. Bleibt gespeichert.'}</span>
      </div>
      {err && <p className="hint" style={{ color: '#b3261e', marginBottom: 8 }}>{err}</p>}
      {shots.length === 0 ? (
        <p className="hint">Noch keine Screenshots — zieh mehrere Bilder hierher oder lade sie hoch. Sie stehen dann hier und im Post-Generator, in TikTok Slides und im Mockup-Studio bereit.</p>
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
      <div className="dropzone-overlay">Bilder hier ablegen</div>
    </div>
  )
}
