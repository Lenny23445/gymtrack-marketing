// Transparenter TikTok-UI-Rahmen als reine Orientierungshilfe ÜBER der Vorschau.
// Nutzt das Original-Template als transparentes PNG (public/tiktok-frame.png):
// Schachbrett-/Dunkel-Hintergrund wurde herausgerechnet, übrig sind nur die
// UI-Elemente (Following/For You, Aktionsleiste, Username/Beschreibung, Navi).
// NIE im Export enthalten (nur DOM-Overlay, wird beim PNG-Download nicht gezeichnet),
// nicht interaktiv (pointer-events: none), damit Sticker/Text darunter greifbar bleiben.

export function TikTokFrame() {
  return (
    <div className="ttf" aria-hidden>
      <img
        className="ttf-img"
        src={import.meta.env.BASE_URL + 'tiktok-frame.png'}
        alt=""
        draggable={false}
      />
    </div>
  )
}
