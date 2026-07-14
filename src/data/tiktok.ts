import type { Category, Idea, TikTokConcept, TikTokSlide } from '../lib/types'

// TikTok Photo-Mode Generator.
// Prinzipien (was auf TikTok viral geht):
//  - 1-2 Slides max: kurze Aufmerksamkeitsspanne, hohe Completion-Rate = mehr Push.
//  - Slide 1 stoppt den Daumen in <1 s: Schmerz, Neugier, Selbstironie, POV.
//  - Ton: kleingeschrieben, gesprochen, ehrlich — wie eine Nachricht an einen Freund,
//    nicht wie eine Anzeige. Genau das unterscheidet TikTok von Instagram.
//  - Trending Sound ist der #1 Reichweiten-Hebel — wichtiger als das Bild.
//  - Wenige Hashtags (4-6), Mix #fyp / breit / Nische.

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}

// Slide 1 = der Hook. Bewusst menschlich: klein geschrieben, Umgangston,
// Selbstironie, direkte Ansprache. Kein Marketing-Deutsch.
const HOOKS: Record<Category, ((i: Idea) => string)[]> = {
  education: [
    () => 'ich hab 2 jahre trainiert\nohne zu wissen, ob ich\nüberhaupt stärker werde.\n\nsei schlauer als ich.',
    () => 'keiner sagt dir das im gym:\n\ndein plan ist egal,\nwenn du ihn nicht misst.',
    () => 'okay das klingt langweilig,\naber es hat mein training\nkomplett verändert:',
    () => 'du musst nicht härter\ntrainieren.\n\ndu musst wissen,\nwas letzte woche ging.',
    () => 'sachen, die ich gern\nan tag 1 gewusst hätte\n\n(teil 1)',
  ],
  problem: [
    () => 'du gehst 5x die woche\nins gym und weißt trotzdem\nnicht, ob du fortschritt\nmachst?\n\nja. genau du.',
    () => 'sag mir, dass du dein\ntraining nicht trackst,\nohne es mir zu sagen:\n\n„was hatte ich letztes\nmal nochmal drauf?“',
    () => 'dein bankdrücken steht\nseit 6 monaten und du\nnennst es „plateau“.\n\nes ist kein plateau.',
    () => 'unbequeme wahrheit:\n\ndein training ist nicht\nschlecht. du siehst nur\nnicht, was funktioniert.',
    () => 'pov: du fängst zum\n4. mal von vorne an,\nweil keiner weiß, wo du\nstehen geblieben bist.',
  ],
  feature: [
    () => 'ich hab mir die gym-app\ngebaut, die ich selbst\nimmer gebraucht hab.',
    () => 'mein gedächtnis: weg.\nmeine gains: dokumentiert.',
    () => 'kein feed. keine werbung.\nnur dein training.\n\nso sollte eine gym-app\naussehen.',
    () => '30 sekunden nach dem satz\nweißt du genau, ob du\nbesser geworden bist.',
    i => i.title + '.',
  ],
  motivation: [
    () => 'woche 1 postet niemand.\nwoche 52 posten alle.\n\nfang einfach an.',
    () => 'du brauchst keine\nmotivation.\n\ndu brauchst einen plan\nund ein log.',
    () => 'in 6 monaten wirst du dir\nwünschen, du wärst heute\ngestartet.\n\ndas ist dein zeichen.',
    () => 'niemand klatscht bei\nsatz 1.\n\naber satz 1 steht für\nimmer in deinem log.',
    () => 'schlechtes workout?\negal. steht trotzdem im log.\nzählt trotzdem.',
  ],
  comparison: [
    () => 'zwei leute. gleiches gym.\ngleiche zeit.\n\neiner trackt. einer rät.\n\nin einem jahr reden wir.',
    () => 'training nach gefühl:\n„lief ganz gut“\n\ntraining mit daten:\n„+7,5 kg in 8 wochen“',
    () => 'zettel und kuli im gym?\n\n2010 will seinen\ntrainingsplan zurück.',
    i => i.title,
  ],
  community: [
    () => 'sag mir deine lieblings-\nübung, ohne sie mir\nzu sagen.\n\nich fang an:\nbank frei, montag, 17 uhr.',
    () => 'unpopular gym opinion.\nlos, in die kommentare.\n\nich lese alles.',
    () => 'push pull legs oder\nganzkörper?\n\n(es gibt eine richtige\nantwort und ihr wisst es)',
    i => i.title.replace(/\?$/, '') + '?',
  ],
}

// Slide 2 = Payoff / Aufloesung / weicher CTA. Optional.
const PAYOFFS: Record<Category, string[]> = {
  education: ['tracken. vergleichen.\nsteigern.\n\nmehr ist es nicht.', 'my gym track.\ndamit du es schwarz\nauf weiß hast.'],
  problem: ['die lösung kostet dich\n30 sekunden pro workout.', 'my gym track.\nschluss mit raten.'],
  feature: ['my gym track.\nteste es beim nächsten\nworkout.', 'gebaut von jemandem,\nder selbst trainiert.\nman merkt es.'],
  motivation: ['erster eintrag heute.\nder rest kommt\nvon allein.', 'fortschritt, den du siehst,\nmacht süchtig.\nim guten sinne.'],
  comparison: ['sei der, der trackt.', 'my gym track.\nwähl die richtige seite.'],
  community: ['folg mir für mehr\ngym real talk.', 'speichern und an deinen\ngym-partner schicken.'],
}

// Sound-Vibes passend zum Hook-Typ. Konkrete Titel wechseln taeglich ->
// Live-Auswahl ueber die Trend-Links unten.
const SOUNDS: { vibe: string; how: string }[] = [
  { vibe: 'Aggressiver Gym-Phonk / Hard Bass (140+ BPM)', how: 'Über „Trending Sounds (live)“ unten öffnen, Region Deutschland, letzte 7 Tage — einen steigenden Sound aus den Top 20 nehmen.' },
  { vibe: 'Cinematic Build-up (Piano → Bass Drop)', how: 'Bei 2 Slides: Slide-Wechsel auf den Drop legen. Sound live über die Trend-Links prüfen.' },
  { vibe: 'Ruhiger, viraler Lo-Fi-Beat', how: 'Passt zu Education-Slides. In der TikTok-Suche Sounds mit steigendem Pfeil (🔥) wählen.' },
  { vibe: 'Gesprochenes Trending-Audio (Meme/Voiceover)', how: 'Bei #gymtok schauen, welches Speech-Audio gerade läuft, und den Slide-Text darauf abstimmen.' },
]

const HOOK_TYPES: Record<Category, string> = {
  education: 'Curiosity / „Geheimwissen“',
  problem: 'Pain-Point / Selbsterkennung',
  feature: 'Indie-Story / Show-don\'t-tell',
  motivation: 'Emotion / Zukunfts-Ich',
  comparison: 'Kontrast / Vorher-Nachher',
  community: 'Frage / Comment-Bait',
}

// TikTok-Hashtags: wenige, Mix aus Reichweite + Nische. #fyp/#foryou immer dabei.
const BROAD = ['fyp', 'foryou', 'gymtok', 'fitnesstok', 'gym', 'fitness']
const NICHE_DE = ['fitnessdeutschland', 'gymdeutschland', 'krafttraining', 'muskelaufbau', 'fitnessmotivation']
const NICHE_TOPIC = ['workouttracking', 'progressiveoverload', 'gymtracker', 'fortschritt', 'trainingsplan']

function tiktokHashtags(): string[] {
  return ['mygymtrack', ...pick(BROAD, 3), ...pick(NICHE_DE, 1), ...pick(NICHE_TOPIC, 1)]
}

const POSTING_TIPS = [
  'Slide 1 ist auch dein Cover: muss als Standbild im Feed funktionieren.',
  'In der ersten Stunde jeden Kommentar beantworten — das entscheidet über den zweiten Push.',
  'Denselben Hook mit 2 verschiedenen Sounds testen; der Sound macht oft den Unterschied.',
  'Beste Posting-Zeiten für Gym-Content DE: 6–8 Uhr und 17–21 Uhr.',
]

// Umsetzungs-Playbook: baut auf den Mustern gerade viraler Foto-Posts auf
// (Photo-Mode + Trend-Sound + Comment-Bait + Reply-Videos).
const PLAN_BASE: string[] = [
  'TikTok → Foto-Modus: Slides in Reihenfolge hochladen, 3–4 Sekunden pro Slide.',
  'Sound zuerst: über „Trending Sounds (live)“ einen steigenden Sound wählen — er bringt mehr Reichweite als das Bild.',
  'Caption kurz + Frage ans Publikum, dazu die 4–6 Hashtags. Nicht mehr.',
  'Direkt nach dem Posten selbst den ersten Kommentar setzen (Frage oder Zusatz-Fact) — startet die Kommentarspalte.',
]

const PLAN_EXTRA: Record<Category, string> = {
  education: 'Läuft der Post: gleiche Struktur als „teil 2“ posten — Serien-Posts pushen sich gegenseitig.',
  problem: 'Auf die besten Kommentare mit Video-Replies antworten — jedes Reply ist ein neuer Post mit eingebautem Publikum.',
  feature: 'App-Screenshot als letzte Slide anhängen (unten wählbar) — erst Story, dann Produkt.',
  motivation: 'Gleichen Text zusätzlich als Story mit Countdown-Sticker posten — doppelte Reichweite, null Aufwand.',
  comparison: 'In den Kommentaren abstimmen lassen („team zettel oder team app?“) — Kontrast-Posts leben von der Debatte.',
  community: 'Beste Antworten screenshotten und als Follow-up-Slides posten — Community-Content erzeugt sich selbst.',
}

// Live-Trends: TikTok bietet keine offene API — diese Links oeffnen die echten
// Live-Rankings direkt (Creative Center ist oeffentlich, ohne Login einsehbar).
export const TREND_LINKS: { label: string; url: string; desc: string }[] = [
  {
    label: 'Trending Sounds (live)',
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en',
    desc: 'Offizielles TikTok-Ranking der Sounds. Oben Region „Germany“ + „Last 7 days“ einstellen.',
  },
  {
    label: 'Trending Hashtags (live)',
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
    desc: 'Meistgenutzte Hashtags, filterbar nach Branche „Sports & Outdoor“.',
  },
  {
    label: '#gymtok jetzt ansehen',
    url: 'https://www.tiktok.com/tag/gymtok',
    desc: 'Was in der Nische gerade viral geht — Sounds und Formate der Top-Videos übernehmen.',
  },
  {
    label: 'Foto-Slides Inspiration',
    url: 'https://www.tiktok.com/search?q=gym%20tipps',
    desc: 'Aktuelle Foto-Posts der Konkurrenz: Hook-Stil und Slide-Anzahl vergleichen.',
  },
]

export function generateTikTok(idea: Idea): TikTokConcept {
  const hook = rand(HOOKS[idea.cat])(idea)
  // ~60 % zweislidig (Hook + Payoff), ~40 % einslidig (Hook + Sound tragen allein)
  const twoSlides = Math.random() < 0.6
  const slides: TikTokSlide[] = [{ text: hook, note: 'Hook — stoppt den Scroll. Großer, zentrierter Text.' }]
  if (twoSlides) {
    slides.push({ text: rand(PAYOFFS[idea.cat]), note: 'Payoff — Auflösung + weicher CTA. Erst nach dem Hook zeigen.' })
  }
  const caption = `${idea.short} ${idea.title.includes('?') ? '' : 'Wie siehst du das?'}`.trim()
  return {
    ideaId: idea.id,
    category: idea.cat,
    hookType: HOOK_TYPES[idea.cat],
    slides,
    caption,
    hashtags: tiktokHashtags(),
    sound: rand(SOUNDS),
    postingTip: rand(POSTING_TIPS),
    plan: [...PLAN_BASE, PLAN_EXTRA[idea.cat]],
  }
}

export function tiktokAsText(t: TikTokConcept, title: string): string {
  return [
    'TIKTOK PHOTO-SLIDES: ' + title,
    'Hook-Typ: ' + t.hookType,
    '',
    ...t.slides.map((s, i) => `SLIDE ${i + 1}:\n"${s.text.replace(/\n/g, ' ')}"\n(${s.note})`),
    '',
    'SOUND: ' + t.sound.vibe,
    '→ ' + t.sound.how,
    '',
    'CAPTION:',
    t.caption,
    '',
    t.hashtags.map(h => '#' + h).join(' '),
    '',
    'SO SETZT DU ES UM:',
    ...t.plan.map((p, i) => `${i + 1}. ${p}`),
    '',
    'TIPP: ' + t.postingTip,
  ].join('\n')
}
