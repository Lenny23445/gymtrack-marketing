// Transparenter TikTok-UI-Rahmen als reine Orientierungshilfe ÜBER der Vorschau.
// Nachgebaut nach dem echten TikTok-Screenshot: oben die Suchleiste, rechts die
// Aktionsleiste (Profil-Hantel, Herz, Kommentar, Merken, „…", Musik-Disc), links die
// schwebende Story-Blase, unten Name + Foto-Chip + Zeit + Hashtags + Sound.
// Nie im Export enthalten (nur DOM-Overlay), nicht interaktiv (pointer-events: none),
// damit Sticker/Text darunter greifbar bleiben.

const ico = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
)

export function TikTokFrame() {
  return (
    <div className="ttf" aria-hidden>
      {/* Obere Suchleiste */}
      <div className="ttf-top">
        <span className="ttf-back">‹</span>
        <span className="ttf-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <em>gym gymtok</em>
        </span>
        <span className="ttf-search-btn">Suchen</span>
      </div>

      {/* Linke schwebende Story-Blase */}
      <div className="ttf-story">
        <span className="ttf-story-heart">♥</span>
      </div>

      {/* Rechte Aktionsleiste */}
      <div className="ttf-side">
        <div className="ttf-brand">
          {/* Hantel-Icon (Marken-Profil) */}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M2 9.5h1.6v5H2zM3.8 7.6h1.8v8.8H3.8zM5.8 10.4h12.4v3.2H5.8zM18.4 7.6h1.8v8.8h-1.8zM20.4 9.5H22v5h-1.6z" />
          </svg>
        </div>
        <div className="ttf-act">
          <span className="ttf-heart">{ico('M12 21s-7.5-4.6-10-9.1C.5 8.9 2.2 6 5.1 6c1.9 0 3.1 1.1 3.9 2.2C9.8 7.1 11 6 12.9 6c2.9 0 4.6 2.9 3.2 5.9C19.5 16.4 12 21 12 21z')}</span>
          <b>3</b>
        </div>
        <div className="ttf-act">
          {ico('M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z')}
          <b>Sei 1.</b>
        </div>
        <div className="ttf-act">
          {ico('M6 3h12a1 1 0 0 1 1 1v17l-7-5-7 5V4a1 1 0 0 1 1-1z')}
          <b>1</b>
        </div>
        <div className="ttf-act">
          {ico('M6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0zM13.6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0zM21.2 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z')}
        </div>
        <div className="ttf-disc" />
      </div>

      {/* Unten: Name + Foto-Chip + Zeit, Hashtags, Sound */}
      <div className="ttf-bottom">
        <div className="ttf-userline">
          <b>MyGymTrack</b>
          <span className="ttf-chip">▣ Foto</span>
          <span className="ttf-time">· Vor 12 Min.</span>
        </div>
        <div className="ttf-desc">#mygymtrack #gymtok #community # …</div>
        <div className="ttf-sound">♫ Enthält: Summer Nights — …</div>
      </div>
    </div>
  )
}
