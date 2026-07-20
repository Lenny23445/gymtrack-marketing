import { useEffect, useRef } from 'react'
import { parseRich, wrapColor, toHex } from '../lib/richtext'

// Rich-Text-Editor OHNE Sternchen: Text schreiben wie gewohnt, eine Passage mit der
// Maus/dem Finger MARKIEREN und in der Farbleiste eine Farbe antippen → die Auswahl
// wird farbig. „Standard" hebt die Farbe wieder auf. Intern wird alles als Farb-Token
// (siehe lib/richtext.ts) gespeichert; der Canvas rendert exakt diese Farben.
//
// Umsetzung: ein contentEditable-Feld mit white-space: pre-wrap. Enter/Umbruch wird als
// echtes \n eingefuegt (keine <div>-Bloecke), Einfuegen wird auf Klartext reduziert —
// dadurch bleibt die Serialisierung robust: Textknoten (inkl. \n) + Farb-Spans.

const BASE = '#1D1D1F' // Basis-Textfarbe im Editor = „keine Farbe"

// Kompakte Schnellpalette fuer die Auswahl-Faerbung (plus Akzent + freie Farbe).
const QUICK = ['#FFFFFF', '#0A0A0A', '#FF375F', '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#40C8E0', '#5E5CE6', '#BF5AF2']

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Wert (Token-String) → HTML fuer das Editor-Feld. Farb-Tokens und Legacy-*Sternchen*
// werden zu farbigen <span>; \n bleibt als Zeichen (pre-wrap rendert den Umbruch).
function toHtml(value: string, accent: string): string {
  if (!value) return ''
  return parseRich(value)
    .map(seg => {
      const color = seg.color ?? (seg.hl ? accent : undefined)
      const text = escapeHtml(seg.text)
      return color ? `<span style="color:${color}">${text}</span>` : text
    })
    .join('')
}

// Editor-DOM → Token-String. Effektive Farbe je Textknoten aus dem Computed Style;
// Farbe == BASE ⇒ Klartext. Farb-Runs werden an \n gebrochen (Tokens nie ueber Zeilen).
function serialize(root: HTMLElement): string {
  let out = ''
  const emit = (text: string, hex: string) => {
    const parts = text.split('\n')
    parts.forEach((p, i) => {
      if (i > 0) out += '\n'
      if (!p) return
      out += hex && hex !== BASE ? wrapColor(p, hex) : p
    })
  }
  const walk = (node: Node) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === Node.TEXT_NODE) {
        const t = ch.textContent ?? ''
        if (!t) return
        const el = ch.parentElement
        const hex = el ? toHex(getComputedStyle(el).color) : BASE
        emit(t, hex)
      } else if (ch.nodeName === 'BR') {
        out += '\n'
      } else if (ch.nodeType === Node.ELEMENT_NODE) {
        const block = /^(DIV|P|LI)$/.test(ch.nodeName)
        if (block && out && !out.endsWith('\n')) out += '\n'
        walk(ch)
        if (block && !out.endsWith('\n')) out += '\n'
      }
    })
  }
  walk(root)
  // contentEditable setzt teils geschuetzte Leerzeichen (nbsp) → auf normale mappen,
  // dann fuehrende/abschliessende Leerzeilen kappen.
  return out.replace(/ /g, ' ').replace(/\n+$/, '')
}

export function RichTextEditor({
  value,
  onChange,
  accent,
  rows = 3,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  accent: string
  rows?: number
  ariaLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastRange = useRef<Range | null>(null)

  // Externen Wert ins DOM spiegeln, aber nur wenn er wirklich abweicht (sonst springt
  // der Cursor). Beim Tippen ist value === serialize(el) → kein Schreiben.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (serialize(el) !== value) el.innerHTML = toHtml(value, accent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Letzte nicht-leere Auswahl innerhalb des Editors merken (fuer die Farb-Buttons,
  // falls der Fokus beim Klick kurz wechselt — v.a. beim nativen Farbwaehler).
  useEffect(() => {
    const onSel = () => {
      const el = ref.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0) return
      const r = sel.getRangeAt(0)
      if (!sel.isCollapsed && el.contains(r.commonAncestorContainer)) lastRange.current = r.cloneRange()
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const push = () => {
    const el = ref.current
    if (el) onChange(serialize(el))
  }

  const applyColor = (color: string | null) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel) return
    // Auswahl wiederherstellen, falls sie verloren ging.
    const inside = sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)
    if ((sel.isCollapsed || !inside) && lastRange.current) {
      sel.removeAllRanges()
      sel.addRange(lastRange.current)
    }
    if (sel.isCollapsed) return // nichts markiert → nichts tun
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand('foreColor', false, color ?? BASE)
    if (sel.rangeCount > 0) lastRange.current = sel.getRangeAt(0).cloneRange()
    push()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.execCommand('insertText', false, '\n')
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div className="rte-wrap">
      <div className="rte-bar" onMouseDown={e => e.preventDefault()}>
        <span className="rte-bar-label">Auswahl färben</span>
        <button type="button" className="rte-swatch rte-reset" title="Farbe entfernen" onClick={() => applyColor(null)}>
          A
        </button>
        <button
          type="button"
          className="rte-swatch"
          style={{ background: accent }}
          title="Akzentfarbe"
          onClick={() => applyColor(accent)}
        />
        {QUICK.map(c => (
          <button
            key={c}
            type="button"
            className="rte-swatch"
            style={{ background: c }}
            title={c}
            onClick={() => applyColor(c)}
          />
        ))}
        <label className="rte-swatch rte-custom" title="Freie Farbe">
          <span>＋</span>
          <input type="color" onChange={e => applyColor(e.target.value.toUpperCase())} />
        </label>
      </div>
      <div
        ref={ref}
        className="rte"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        style={{ minHeight: rows * 26 }}
        onInput={push}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    </div>
  )
}
