import { useEffect, useRef } from 'react'
import { parseRich, wrapRich, toHex } from '../lib/richtext'
import { FONTS, FONT_STACKS, fontKeyFromFamily } from '../lib/fonts'
import type { FontKey } from '../lib/fonts'

// Rich-Text-Editor OHNE Sternchen: Text schreiben wie gewohnt, eine Passage mit der
// Maus/dem Finger MARKIEREN und in der Leiste eine Farbe ODER Schriftart antippen → die
// Auswahl wird eingefaerbt bzw. bekommt die Schrift. „A" hebt die Farbe wieder auf,
// „Aa" die Schrift. Mehrere Passagen koennen jeweils EIGENE Farbe/Schrift tragen. Intern
// wird alles als Token (siehe lib/richtext.ts) gespeichert; der Canvas rendert exakt das.
//
// Umsetzung: ein contentEditable-Feld mit white-space: pre-wrap. Enter/Umbruch wird als
// echtes \n eingefuegt (keine <div>-Bloecke), Einfuegen wird auf Klartext reduziert —
// dadurch bleibt die Serialisierung robust: Textknoten (inkl. \n) + Farb-/Schrift-Spans.

const BASE = '#1D1D1F' // Basis-Textfarbe im Editor = „keine Farbe"

// Kompakte Schnellpalette fuer die Auswahl-Faerbung (plus Akzent + freie Farbe).
const QUICK = ['#FFFFFF', '#0A0A0A', '#FF375F', '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#40C8E0', '#5E5CE6', '#BF5AF2']

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Wert (Token-String) → HTML fuers Editor-Feld. Farb-/Schrift-Tokens und Legacy-*Sternchen*
// werden zu gestylten <span>; \n bleibt als Zeichen (pre-wrap rendert den Umbruch).
function toHtml(value: string, accent: string): string {
  if (!value) return ''
  return parseRich(value)
    .map(seg => {
      const color = seg.color ?? (seg.hl ? accent : undefined)
      const text = escapeHtml(seg.text)
      const styles: string[] = []
      if (color) styles.push(`color:${color}`)
      if (seg.font && FONT_STACKS[seg.font]) styles.push(`font-family:${FONT_STACKS[seg.font]}`)
      return styles.length ? `<span style="${styles.join(';')}">${text}</span>` : text
    })
    .join('')
}

// Naechste explizite Schrift-Angabe eines Text-Knotens (inline font-family oder <font face>)
// → FontKey. Die ERSTE gefundene Angabe gewinnt: „inherit"/unbekannt = ausdruecklich keine
// Schrift (Reset), damit ein aeusseres Schrift-Span nicht faelschlich durchschlaegt.
function nodeFont(start: HTMLElement | null, root: HTMLElement): FontKey | undefined {
  let n: HTMLElement | null = start
  while (n && n !== root) {
    let ff: string | null = null
    if (n.style && n.style.fontFamily) ff = n.style.fontFamily
    else if (n.nodeName === 'FONT') ff = n.getAttribute('face')
    if (ff) return fontKeyFromFamily(ff)
    n = n.parentElement
  }
  return undefined
}

// Editor-DOM → Token-String. Farbe je Textknoten aus dem Computed Style, Schrift aus der
// naechsten expliziten Angabe. Runs werden an \n gebrochen (Tokens nie ueber Zeilen).
function serialize(root: HTMLElement): string {
  let out = ''
  const emit = (text: string, hex: string, font: FontKey | undefined) => {
    const color = hex && hex !== BASE ? hex : undefined
    const parts = text.split('\n')
    parts.forEach((p, i) => {
      if (i > 0) out += '\n'
      if (!p) return
      out += wrapRich(p, color, font)
    })
  }
  const walk = (node: Node) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === Node.TEXT_NODE) {
        const t = ch.textContent ?? ''
        if (!t) return
        const el = ch.parentElement
        const hex = el ? toHex(getComputedStyle(el).color) : BASE
        emit(t, hex, nodeFont(el, root))
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
  return out.replace(/ /g, ' ').replace(/\n+$/, '')
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

  // Letzte nicht-leere Auswahl innerhalb des Editors merken (fuer die Leisten-Buttons,
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

  // Auswahl (ggf. zuletzt gemerkte) sicherstellen; liefert false, wenn nichts markiert ist.
  const ensureSelection = (): boolean => {
    const el = ref.current
    if (!el) return false
    el.focus()
    const sel = window.getSelection()
    if (!sel) return false
    const inside = sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)
    if ((sel.isCollapsed || !inside) && lastRange.current) {
      sel.removeAllRanges()
      sel.addRange(lastRange.current)
    }
    return !sel.isCollapsed
  }

  const rememberSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) lastRange.current = sel.getRangeAt(0).cloneRange()
  }

  const applyColor = (color: string | null) => {
    if (!ensureSelection()) return
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand('foreColor', false, color ?? BASE)
    rememberSelection()
    push()
  }

  const applyFont = (key: FontKey | null) => {
    if (!ensureSelection()) return
    // fontName erzeugt je nach Browser <font face> oder <span style="font-family">; beides
    // liest serialize aus. „inherit" = Schrift wieder entfernen (folgt dem Slide-Standard).
    document.execCommand('fontName', false, key ? FONT_STACKS[key] : 'inherit')
    rememberSelection()
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

  // Buttons halten die Text-Auswahl (preventDefault auf mousedown). NICHT auf dem nativen
  // Farbwaehler-Label — sonst oeffnet Chromium/WebKit das Farbmenue gar nicht (alter Bug).
  const keepSel = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="rte-wrap">
      <div className="rte-bar">
        <span className="rte-bar-label">Auswahl färben</span>
        <button type="button" className="rte-swatch rte-reset" title="Farbe entfernen" onMouseDown={keepSel} onClick={() => applyColor(null)}>
          A
        </button>
        <button
          type="button"
          className="rte-swatch"
          style={{ background: accent }}
          title="Akzentfarbe"
          onMouseDown={keepSel}
          onClick={() => applyColor(accent)}
        />
        {QUICK.map(c => (
          <button
            key={c}
            type="button"
            className="rte-swatch"
            style={{ background: c }}
            title={c}
            onMouseDown={keepSel}
            onClick={() => applyColor(c)}
          />
        ))}
        <label className="rte-swatch rte-custom" title="Alle Farben — eigene wählen">
          <span>＋</span>
          <input type="color" onChange={e => applyColor(e.target.value.toUpperCase())} />
        </label>
      </div>
      <div className="rte-bar rte-bar-fonts">
        <span className="rte-bar-label">Auswahl-Schrift</span>
        <button type="button" className="rte-font rte-font-reset" title="Schrift zurücksetzen" onMouseDown={keepSel} onClick={() => applyFont(null)}>
          Aa
        </button>
        {FONTS.map(f => (
          <button
            key={f.key}
            type="button"
            className="rte-font"
            style={{ fontFamily: f.stack }}
            title={f.label}
            onMouseDown={keepSel}
            onClick={() => applyFont(f.key)}
          >
            {f.label}
          </button>
        ))}
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
