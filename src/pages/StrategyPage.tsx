import { HASHTAG_ADVICE, HASHTAG_TIERS } from '../data/hashtags'

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Funnel-Logik: aufwärmen statt bewerben',
    items: [
      'Kalt (kennt dich nicht): Education & Problem Awareness — Wert liefern, Problem bewusst machen. Kein App-Pitch.',
      'Warm (folgt dir): Vergleichs-Content & App-Vorteile — zeigen, wie Tracking das Problem löst.',
      'Heiß (überlegt): Mockups, Feature-Posts, Community-Beweise — der letzte Schritt zur Installation.',
      'Faustregel 80/20: 80 % Mehrwert (Education, Motivation, Community), 20 % App-Content. Wer nur wirbt, verliert Reichweite und Vertrauen.',
    ],
  },
  {
    title: 'Posting-Rhythmus',
    items: [
      '1 Feed-Post pro Tag (Kalender-Seite nutzen) — Konsistenz schlägt Frequenz-Spitzen.',
      '2–3 Reels pro Woche: Reels sind der Reichweiten-Hebel für neue Follower.',
      '2–3 Stories pro Tag: Umfragen, Quiz („Wie viele Sätze pro Muskel?“), Behind-the-Scenes aus der App-Entwicklung.',
      'Beste Zeiten (DE, Fitness-Zielgruppe): 6–8 Uhr, 12–13 Uhr, 17–20 Uhr. Am Wochenende vormittags. Nach 2 Wochen gegen eigene Insights prüfen.',
    ],
  },
  {
    title: 'Hook-Regeln (erste Zeile entscheidet)',
    items: [
      'Erste 3 Wörter müssen stoppen: Frage, Zahl, Widerspruch oder direkte Ansprache.',
      'Nie mit dem App-Namen starten — erst Problem/Wert, Marke am Ende.',
      'Ein Post = eine Botschaft. Zwei Ideen sind zwei Posts.',
      'Vorschau-Grenze beachten: Hook unter 80 Zeichen, sonst schneidet Instagram ab.',
    ],
  },
  {
    title: 'Community & Vertrauen',
    items: [
      'Auf jeden Kommentar in den ersten 60 Minuten antworten — das Zeitfenster entscheidet über Reichweite.',
      'Indie-Entwickler-Story nutzen: „Student baut Gym-App“ ist ein Vertrauens- und Sympathie-Vorteil gegenüber Konzern-Apps.',
      'User-Ergebnisse reposten (mit Erlaubnis): echte Fortschritts-Screenshots sind der stärkste Social Proof.',
      'Feature-Wünsche öffentlich sammeln und Umsetzung zeigen — macht Follower zu Mitgestaltern.',
    ],
  },
  {
    title: 'KPIs — wöchentlich prüfen',
    items: [
      'Saves & Shares: wichtigste Signale für den Algorithmus, wichtiger als Likes.',
      'Reichweite Nicht-Follower: zeigt, ob Content aus der Bubble kommt.',
      'Profilaufrufe → Follows: schwache Quote = Profil/Bio überarbeiten.',
      'Website-/App-Store-Taps: die eigentliche Conversion. In der Bio sauber verlinken.',
      'A/B-Prinzip: gleiche Idee, zwei Hooks, eine Woche Abstand — Gewinner-Muster in die Datenbank übernehmen.',
    ],
  },
]

export default function StrategyPage() {
  return (
    <>
      <div className="page-header">
        <h1>Strategie</h1>
        <p>Das Growth-Playbook hinter dem Tool: wie aus Fitness-Interessierten Follower und aus Followern App-Nutzer werden.</p>
      </div>
      <div className="stack">
        {SECTIONS.map(s => (
          <div className="card" key={s.title}>
            <h3>{s.title}</h3>
            <ul className="suggestions">
              {s.items.map((i, n) => <li key={n}>{i}</li>)}
            </ul>
          </div>
        ))}
        <div className="card">
          <h3>Hashtag-System</h3>
          {HASHTAG_TIERS.map(t => (
            <p key={t.label} style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{t.label}</strong> <span className="hint">({t.reach})</span><br />
              <span className="hint">{t.tags.map(x => '#' + x).join(' ')}</span>
            </p>
          ))}
          <ul className="suggestions" style={{ marginTop: 10 }}>
            {HASHTAG_ADVICE.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      </div>
    </>
  )
}
