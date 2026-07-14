import type { Category } from '../lib/types'

export interface HashtagTier {
  label: string
  reach: string
  tags: string[]
}

export const HASHTAG_TIERS: HashtagTier[] = [
  {
    label: 'Große Reichweite',
    reach: '> 10 Mio. Beiträge — hohe Konkurrenz, kurze Sichtbarkeit',
    tags: ['fitness', 'gym', 'workout', 'fitnessmotivation', 'training', 'bodybuilding', 'gymlife', 'fit', 'muscle', 'strength'],
  },
  {
    label: 'Mittlere Reichweite',
    reach: '100k – 10 Mio. Beiträge — guter Mix aus Reichweite und Auffindbarkeit',
    tags: ['gymmotivation', 'fitnessprogress', 'krafttraining', 'muskelaufbau', 'fitnessdeutschland', 'gymrat', 'trainingsplan', 'fitnessjourney', 'progressiveoverload', 'strengthtraining', 'gymgermany', 'naturalbodybuilding'],
  },
  {
    label: 'Nische',
    reach: '< 100k Beiträge — kleine, aber exakt passende Zielgruppe',
    tags: ['workouttracking', 'gymtracker', 'trainingstagebuch', 'hypertrophytraining', 'fitnessapp', 'trackyourprogress', 'workoutlog', 'trainingslog', 'progressnotperfection', 'gymnerd', 'liftingnumbers', 'evidencebasedtraining'],
  },
]

export const BRAND_TAGS = ['mygymtrack']

const CATEGORY_EXTRA: Record<Category, string[]> = {
  education: ['fitnesswissen', 'trainingstipps', 'gymtips'],
  problem: ['fitnessfails', 'plateaubreaker', 'gymstruggles'],
  feature: ['fitnesstech', 'apptipp', 'workoutapp'],
  motivation: ['disziplin', 'mindsetmatters', 'keinausreden'],
  comparison: ['gymfacts', 'trainingsmythen', 'fitnessvergleich'],
  community: ['gymcommunity', 'fitnessfamily', 'gymbuddies'],
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}

// Empfehlung: 20-25 Hashtags, Mix ~20 % gross / 40 % mittel / 40 % Nische + Brand
export function generateHashtags(cat: Category): string[] {
  return [
    ...BRAND_TAGS,
    ...pick(HASHTAG_TIERS[0].tags, 4),
    ...pick(HASHTAG_TIERS[1].tags, 8),
    ...pick(HASHTAG_TIERS[2].tags, 8),
    ...pick(CATEGORY_EXTRA[cat], 2),
  ]
}

export const HASHTAG_ADVICE = [
  '20–25 Hashtags pro Post: Instagram erlaubt 30, aber Qualität schlägt Menge.',
  'Mix-Regel: ~20 % große, ~40 % mittlere, ~40 % Nischen-Hashtags.',
  'Brand-Hashtag #mygymtrack in jeden Post — baut langfristig eine durchsuchbare Sammlung auf.',
  'Nischen-Hashtags bringen die wertvollsten Follower: kleine Reichweite, exakte Zielgruppe.',
  'Hashtags in die Caption, nicht in den ersten Kommentar — beides funktioniert, Caption ist konsistenter messbar.',
  'Alle 4–6 Wochen Sets rotieren, sonst stuft der Algorithmus sie als Spam-Muster ein.',
]
