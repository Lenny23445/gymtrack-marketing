import type { Category, Idea, ReelConcept, ReelScene } from '../lib/types'
import { generateHashtags } from './hashtags'
import { CTAS } from './ideas'

interface ReelSkeleton {
  audio: string
  scenes: (idea: Idea, cta: string) => ReelScene[]
}

const SKELETONS: Record<Category, ReelSkeleton[]> = {
  education: [
    {
      audio: 'Ruhiger, cleaner Beat (z. B. minimal Tech-House, 90–100 BPM)',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Schwarzer Screen, weiße Headline tippt sich ein. Kein Gesicht, nur Typo.' },
        { time: '3–7 s', text: idea.short, scene: 'Text bleibt, darunter blendet die Kernaussage ein. Subtiler Zoom.' },
        { time: '7–12 s', text: 'Die Lösung: Tracking.', scene: 'Schneller Cut: Hand loggt Satz in der App (Screen-Recording, verlangsamt).' },
        { time: '12–15 s', text: cta, scene: 'App-Logo auf schwarzem Grund, Wordmark „My Gym Track“ faded ein.' },
      ],
    },
    {
      audio: 'Voiceover-freundlich: dezenter Lo-Fi-Beat',
      scenes: (idea, cta) => [
        { time: '0–2 s', text: 'Wusstest du das?', scene: 'POV Gym: Kamera läuft Richtung Hantelbank. Text als Overlay.' },
        { time: '2–8 s', text: idea.short, scene: 'B-Roll: Training (Langhantel, Plates), Text-Overlay Schritt für Schritt.' },
        { time: '8–13 s', text: 'Genau dafür gibt es Tracking.', scene: 'Screen-Recording: Fortschrittsgraph in der App steigt an.' },
        { time: '13–15 s', text: cta, scene: 'Abschluss-Frame: schwarzes Brand-Design + Handle @mygymtrack.' },
      ],
    },
  ],
  problem: [
    {
      audio: 'Spannungsaufbau, Drop bei Sekunde 7 (Trending Audio prüfen)',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Nahaufnahme: jemand sitzt ratlos auf der Bank, Blick aufs Handy.' },
        { time: '3–7 s', text: idea.short, scene: 'Schnelle Cuts: Zettel, vergessenes Gewicht, fragender Blick.' },
        { time: '7–12 s', text: 'Tracking löst dieses Problem.', scene: 'Drop im Audio. Cut auf App: letztes Workout sofort sichtbar.' },
        { time: '12–15 s', text: cta, scene: 'Ruhiger Abschluss: App auf schwarzem Grund, Logo, Handle.' },
      ],
    },
    {
      audio: 'Dialog-/Meme-Audio mit „vorher/nachher“-Struktur',
      scenes: (idea, cta) => [
        { time: '0–4 s', text: '„' + idea.title + '“', scene: 'Talking Head oder Text-Only: Problem als direkte Frage an die Kamera.' },
        { time: '4–9 s', text: 'So geht es fast allen im Gym.', scene: 'B-Roll: volles Gym, Menschen an Geräten, keiner schreibt etwas auf.' },
        { time: '9–13 s', text: 'Die Lösung dauert 30 Sekunden pro Workout.', scene: 'Screen-Recording: Satz loggen in Echtzeit — beweist die 30 Sekunden.' },
        { time: '13–15 s', text: cta, scene: 'Brand-Frame, CTA als Text, dezenter Sound-Ausklang.' },
      ],
    },
  ],
  feature: [
    {
      audio: 'Apple-Keynote-Vibe: minimal, edel, ruhig',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Schwarzer Frame, Headline in großer weißer Typo (SF-Pro-Look).' },
        { time: '3–9 s', text: idea.short, scene: 'Langsames Screen-Recording des Features, iPhone-Mockup zentriert.' },
        { time: '9–13 s', text: 'Ein Feature. Ein Problem weniger.', scene: 'Detail-Zoom auf das UI-Element, sanfte Kamerafahrt.' },
        { time: '13–15 s', text: cta, scene: 'Logo-Frame mit Wordmark, App-Store-Hinweis klein darunter.' },
      ],
    },
  ],
  motivation: [
    {
      audio: 'Episch-ruhig (Cinematic Piano + Bass), Textkarten im Takt',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Dunkles Gym, eine Person allein am Eisen. Slow Motion.' },
        { time: '3–8 s', text: idea.short, scene: 'Harte Arbeit in Slow-Mo: Kreide, Griff, letzte Wiederholung.' },
        { time: '8–12 s', text: 'Fortschritt ist messbar.', scene: 'Cut: Fortschrittsgraph steigt — Übergang von Schweiß zu Daten.' },
        { time: '12–15 s', text: cta, scene: 'Schwarzer Abschluss-Frame, Wordmark, ein Satz. Nichts sonst.' },
      ],
    },
  ],
  comparison: [
    {
      audio: 'Zweigeteilter Beat: erst dumpf, ab Hälfte klar (Split-Screen-Logik)',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Split-Screen-Ankündigung: links „ohne“, rechts „mit“.' },
        { time: '3–8 s', text: 'Ohne: raten, wiederholen, stagnieren.', scene: 'Linke Seite: Grau, jemand zuckt mit den Schultern am Rack.' },
        { time: '8–13 s', text: 'Mit: wissen, steigern, wachsen.', scene: 'Rechte Seite: Farbe, App zeigt letztes Gewicht, Person legt auf.' },
        { time: '13–15 s', text: cta, scene: 'Split löst sich auf in Brand-Frame mit Logo.' },
      ],
    },
  ],
  community: [
    {
      audio: 'Leichtes, positives Trending Audio (Community-Vibe)',
      scenes: (idea, cta) => [
        { time: '0–3 s', text: idea.title, scene: 'Direkte Frage als große Typo, Person zeigt auf den Text.' },
        { time: '3–8 s', text: idea.short, scene: 'Schnelle Antworten-Collage oder 2–3 kurze Beispiel-Takes.' },
        { time: '8–12 s', text: 'Schreib deine Antwort in die Kommentare.', scene: 'Kommentar-Icon-Animation, Pfeil nach unten.' },
        { time: '12–15 s', text: cta, scene: 'Brand-Frame + „Folge @mygymtrack für mehr“.' },
      ],
    },
  ],
}

export function generateReel(idea: Idea): ReelConcept {
  const pool = SKELETONS[idea.cat]
  const skeleton = pool[Math.floor(Math.random() * pool.length)]
  const cta = idea.cta ?? CTAS[Math.floor(Math.random() * CTAS.length)]
  const scenes = skeleton.scenes(idea, cta)
  return {
    title: idea.title,
    hookLine: scenes[0].text,
    scenes,
    audio: skeleton.audio,
    coverText: idea.title,
    caption: `${idea.title}\n\n${idea.short}\n\n${cta}`,
    hashtags: generateHashtags(idea.cat),
  }
}
