import { CAROUSEL_POINTS, CTAS, QUESTIONS } from '../data/ideas'
import { generateHashtags } from '../data/hashtags'
import type { Category, GeneratedPost, Idea, PostFormat, PostTheme, Slide } from './types'

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}

// Hook-Pools nach Growth-Prinzip: Neugier, Problem, Kontrast — kein Werbe-Sprech
const HOOKS: Record<Category, ((i: Idea) => string)[]> = {
  education: [
    i => i.title + '.',
    () => 'Die meisten Menschen trainieren hart. Aber nur wenige wissen, ob sie wirklich besser werden.',
    i => 'Das versteht fast niemand im Gym: ' + i.title.toLowerCase().replace(/\.$/, '') + '.',
    () => 'Ein Prinzip trennt die, die wachsen, von denen, die stagnieren.',
    i => 'Kurze Wahrheit: ' + i.short,
  ],
  problem: [
    i => i.title,
    () => 'Du trainierst seit Monaten, aber weißt nicht, ob du Fortschritte machst?',
    i => 'Ehrliche Frage: ' + i.title.replace(/\.$/, ''),
    () => 'Das hier kostet dich mehr Gains als jede verpasste Mahlzeit.',
    i => 'Kommt dir das bekannt vor? ' + i.short,
  ],
  feature: [
    i => i.title + '.',
    i => 'Stell dir vor: ' + i.short,
    () => 'Ein kleines Feature. Ein großer Unterschied in deinem Training.',
    i => i.short,
    () => 'Das wünschen sich die meisten, ohne zu wissen, dass es das schon gibt.',
  ],
  motivation: [
    i => i.title + '.',
    i => i.short,
    () => 'Lies das, bevor du dein nächstes Workout absagst.',
    () => 'Niemand postet Woche 1. Alle posten Woche 52.',
    i => 'Merk dir einen Satz: ' + i.title.replace(/\.$/, '') + '.',
  ],
  comparison: [
    i => i.title,
    () => 'Zwei Menschen, gleiches Gym, gleiche Zeit. Ein Unterschied.',
    i => 'Der Unterschied ist größer, als du denkst: ' + i.title.toLowerCase(),
    () => 'Gleicher Aufwand. Doppeltes Ergebnis. So geht das:',
  ],
  community: [
    i => i.title,
    i => 'Frage an alle hier: ' + i.title.replace(/\?$/, '') + '?',
    () => 'Kommentare auf — wir wollen es wirklich wissen.',
  ],
}

// Zwischenzeilen fuer den Caption-Body (Kategorie-neutral, Wert-orientiert)
const BODY_LINES: Record<Category, string[]> = {
  education: [
    'Fortschritt ist kein Gefühl. Fortschritt ist ein Vergleich: heute gegen letzte Woche.',
    'Genau deshalb tracken erfahrene Athleten jede Session — seit Jahrzehnten, früher auf Papier, heute digital.',
    'Wer seine Zahlen kennt, trifft bessere Entscheidungen: mehr Gewicht, mehr Volumen oder bewusst Pause.',
  ],
  problem: [
    'Die Lösung ist unspektakulär: aufschreiben, vergleichen, steuern. 30 Sekunden pro Workout.',
    'Fast jeder im Gym hat dieses Problem. Fast niemand löst es. Dabei ist es das am einfachsten lösbare Problem im Training.',
    'Du brauchst kein neues Programm. Du brauchst Sichtbarkeit über das, was du schon tust.',
  ],
  feature: [
    'Kein Schnickschnack, keine Ablenkung — nur dein Training, klar dargestellt.',
    'Gebaut für den Moment zwischen zwei Sätzen: schnell, fokussiert, dunkel.',
    'Du musst nichts umstellen. Einfach beim nächsten Workout mitloggen und den Unterschied selbst sehen.',
  ],
  motivation: [
    'Disziplin heißt nicht, sich jeden Tag zu quälen. Es heißt, aufzutauchen und einen Haken zu setzen.',
    'Die Tage, an denen du keine Lust hast, sind die Tage, die zählen.',
    'Fortschritt, den man sieht, motiviert mehr als jedes Zitat. Deshalb: messen, nicht hoffen.',
  ],
  comparison: [
    'Der Unterschied liegt nicht im Talent und nicht im Plan. Er liegt in der Rückkopplung: sehen, was funktioniert.',
    'Beides kostet gleich viel Zeit im Gym. Nur eines davon liefert dir Beweise.',
  ],
  community: [
    'Wir bauen hier eine Community für Leute, die es ernst meinen — egal ob Woche 1 oder Jahr 10.',
    'Jede Antwort hilft jemandem, der gerade erst anfängt.',
  ],
}

export function generatePost(
  idea: Idea,
  format: PostFormat,
  theme: PostTheme,
): GeneratedPost {
  const hook = rand(HOOKS[idea.cat])(idea)
  const cta = idea.cta ?? rand(CTAS)
  const question = rand(QUESTIONS)
  const body = rand(BODY_LINES[idea.cat])

  const captionParts = [hook]
  if (hook !== idea.short && !hook.includes(idea.short)) captionParts.push(idea.short)
  captionParts.push(body, cta, question)
  const caption = captionParts.join('\n\n')

  let slides: Slide[] | undefined
  if (format === 'carousel') {
    const points = pickN(CAROUSEL_POINTS[idea.cat], Math.min(4, CAROUSEL_POINTS[idea.cat].length))
    const total = points.length + 2
    slides = [
      { kind: 'cover', heading: idea.title, body: 'Weiterwischen →', index: 1, total },
      ...points.map((p, n) => ({
        kind: 'point' as const,
        heading: p.heading,
        body: p.body,
        index: n + 2,
        total,
      })),
      { kind: 'cta', heading: cta, body: 'Folge @mygymtrack für tägliches Trainings-Wissen.', index: total, total },
    ]
  }

  return {
    id: 'post-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ideaId: idea.id,
    category: idea.cat,
    format,
    theme,
    headline: idea.title,
    sub: idea.short,
    hook,
    caption,
    cta,
    question,
    hashtags: generateHashtags(idea.cat),
    slides,
    createdAt: Date.now(),
  }
}

export function hashtagBlock(tags: string[]): string {
  return tags.map(t => '#' + t).join(' ')
}

export function fullCaption(post: GeneratedPost): string {
  return post.caption + '\n\n' + hashtagBlock(post.hashtags)
}
