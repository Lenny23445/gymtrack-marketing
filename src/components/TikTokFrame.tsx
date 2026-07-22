// Transparenter TikTok-UI-Rahmen als reine Orientierungshilfe ÜBER der Vorschau.
// Exakt nachgebaut nach dem echten MyGymTrack-Screenshot: oben Suchleiste
// („Finde ähnliche Inhalte" · Suchen) + „1 / 2"-Badge, rechts die Aktionsleiste
// (Profil-Hantel, Herz-Outline 0, Kommentar „Sei 1.", Merken-Outline 0, „…"),
// mittig die Karussell-Punkte, unten Name + Foto-Chip + Zeit + Caption + Hashtags,
// rechts unten das kleine Profilbild.
// NIE im Export enthalten (nur DOM-Overlay, wird beim PNG-Download nicht gezeichnet),
// nicht interaktiv (pointer-events: none), damit Sticker/Text darunter greifbar bleiben.

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
          <em>Finde ähnliche Inhalte</em>
        </span>
        <span className="ttf-search-btn">Suchen</span>
      </div>

      {/* Seiten-Badge oben rechts */}
      <div className="ttf-page">1 / 2</div>

      {/* Rechte Aktionsleiste */}
      <div className="ttf-side">
        <div className="ttf-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M2 9.5h1.6v5H2zM3.8 7.6h1.8v8.8H3.8zM5.8 10.4h12.4v3.2H5.8zM18.4 7.6h1.8v8.8h-1.8zM20.4 9.5H22v5h-1.6z" />
          </svg>
        </div>
        <div className="ttf-act">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 20.5S3.5 15.4 3.5 9.6C3.5 6.9 5.6 5 8 5c1.7 0 3.1 1 4 2.3C12.9 6 14.3 5 16 5c2.4 0 4.5 1.9 4.5 4.6 0 5.8-8.5 10.9-8.5 10.9z" />
          </svg>
          <b>0</b>
        </div>
        <div className="ttf-act">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 3C6.9 3 3 6.3 3 10.4c0 2.3 1.3 4.4 3.4 5.8-.2 1.2-.8 2.6-1.7 3.6 1.6-.2 3.4-.9 4.7-1.9.8.2 1.7.3 2.6.3 5.1 0 9-3.3 9-7.4S17.1 3 12 3z" />
          </svg>
          <b>Sei 1.</b>
        </div>
        <div className="ttf-act">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.4.4 0 0 1-.63.33L12 16.8l-5.87 3.73A.4.4 0 0 1 5.5 20.2V4a.5.5 0 0 1 .5-.5z" />
          </svg>
          <b>0</b>
        </div>
        <div className="ttf-more">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0zM13.6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0zM21.2 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z" />
          </svg>
        </div>
      </div>

      {/* Karussell-Punkte (mittig, über der Caption) */}
      <div className="ttf-carousel">
        <i className="on" />
        <i />
      </div>

      {/* Unten: Name + Foto-Chip + Zeit, Caption, Hashtags */}
      <div className="ttf-bottom">
        <div className="ttf-userline">
          <b>MyGymTrack</b>
          <span className="ttf-chip">▣ Foto</span>
          <span className="ttf-time">· Vor 53 Sek.</span>
        </div>
        <div className="ttf-cap">App: MyGymTrack</div>
        <div className="ttf-desc">#gym #gymtok #app #progress #fitne …</div>
      </div>

      {/* Kleines Profilbild rechts unten */}
      <div className="ttf-avatar-sm" />
    </div>
  )
}
