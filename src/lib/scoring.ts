import type { GeneratedPost, Score } from './types'

const POWER_WORDS = [
  'warum', 'fehler', 'wahrheit', 'niemand', 'nie', 'endlich', 'geheimnis',
  'stärker', 'beweis', 'wirklich', 'ehrlich', 'stell dir vor', 'unterschied',
  'die meisten', 'fast keiner', 'plateau', 'pr', 'rekord',
]

function clamp(v: number): number {
  return Math.max(5, Math.min(100, Math.round(v)))
}

// Heuristische Bewertung nach Growth-Kriterien. Kein ML — transparente Regeln,
// damit nachvollziehbar bleibt, warum ein Post gut oder schlecht abschneidet.
export function scorePost(post: GeneratedPost): Score {
  const suggestions: string[] = []
  const hook = post.hook.toLowerCase()

  // Hook-Staerke: Laenge, Frage, Zahl, Power-Words
  let hookScore = 55
  if (post.hook.length <= 80) hookScore += 15
  else suggestions.push('Hook kürzen: unter 80 Zeichen wird in der Vorschau nicht abgeschnitten.')
  if (post.hook.includes('?')) hookScore += 10
  if (/\d/.test(post.hook)) hookScore += 8
  if (POWER_WORDS.some(w => hook.includes(w))) hookScore += 12
  else suggestions.push('Hook könnte ein stärkeres Trigger-Wort vertragen (Warum, Fehler, Wahrheit, die meisten …).')

  // Verstaendlichkeit: Satzlaenge, keine Schachtelsaetze
  let clarity = 70
  const sentences = post.caption.split(/[.!?]/).filter(s => s.trim().length > 0)
  const avgLen = sentences.reduce((a, s) => a + s.length, 0) / Math.max(1, sentences.length)
  if (avgLen < 90) clarity += 20
  else suggestions.push('Sätze kürzen: Durchschnitt über 90 Zeichen liest sich auf dem Handy schwer.')
  if (post.caption.length < 900) clarity += 10
  else suggestions.push('Caption straffen: unter 900 Zeichen bleibt die Lesequote hoch.')

  // Viralitaet: Format, Frage, Speicher-/Share-Trigger
  let viral = 45
  if (post.format === 'carousel') viral += 20
  if (post.question) viral += 12
  if (/speichern|markiere|senden|kommentar/i.test(post.caption)) viral += 15
  else suggestions.push('Share-Trigger ergänzen: „Speichern“ oder „Markiere jemanden“ erhöht Reichweite messbar.')
  if (post.category === 'community') viral += 8

  // Conversion: CTA vorhanden, weich formuliert, App genannt
  let conversion = 40
  if (post.cta) conversion += 20
  if (/my gym track/i.test(post.caption)) conversion += 20
  if (!/download|jetzt kaufen|installier/i.test(post.caption)) conversion += 12
  else suggestions.push('CTA weicher formulieren: „Download jetzt“ wirkt wie Werbung und senkt Engagement.')

  // Markenpassung: Ton, keine Emoji-Flut, Brand-Hashtag
  let brand = 60
  const emojiCount = (post.caption.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []).length
  if (emojiCount <= 2) brand += 15
  else suggestions.push('Weniger Emojis: maximal 1–2 passen zum reduzierten Markenauftritt.')
  if (post.hashtags.includes('mygymtrack')) brand += 15
  if (post.hashtags.length >= 18 && post.hashtags.length <= 28) brand += 10
  else suggestions.push('Hashtag-Anzahl auf 20–25 bringen.')

  const axes = [
    { label: 'Hook-Stärke', value: clamp(hookScore) },
    { label: 'Verständlichkeit', value: clamp(clarity) },
    { label: 'Viralität', value: clamp(viral) },
    { label: 'Conversion-Potenzial', value: clamp(conversion) },
    { label: 'Markenpassung', value: clamp(brand) },
  ]
  const total = Math.round(axes.reduce((a, x) => a + x.value, 0) / axes.length)

  if (suggestions.length === 0) {
    suggestions.push('Solider Post. Variante mit anderem Hook testen (A/B), bevor du das Format wiederholst.')
  }

  return { axes, total, suggestions }
}
