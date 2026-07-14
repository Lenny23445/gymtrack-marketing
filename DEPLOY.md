# Content Studio online stellen (dauerhafte URL)

Ziel: Das Tool von überall im Browser aufrufen — ohne es lokal zu starten.
Die App ist rein statisch (läuft komplett im Browser), also kostenlos hostbar.

## Weg A — GitHub Pages (empfohlen, kostenlos, für immer)

Alles ist schon vorbereitet: relative Pfade + Auto-Deploy-Workflow
(`.github/workflows/deploy.yml`). Du machst nur noch das hier:

### Ohne Terminal (einfachster Weg)

1. **GitHub Desktop** installieren: https://desktop.github.com
2. Mit GitHub-Account anmelden (falls keiner da: auf github.com kostenlos erstellen).
3. In GitHub Desktop: **File → Add Local Repository** → diesen Ordner wählen
   (`Desktop/Claude/gymtrack-marketing`). Fragt es nach „create a repository“: **Ja**.
4. Unten links Commit-Text eintippen (z. B. „Content Studio“) → **Commit to main**.
5. Oben **Publish repository** → Name z. B. `gymtrack-marketing` → **Private** ist ok →
   **Publish**.
6. Auf **github.com** dein Repo öffnen → **Settings → Pages** →
   unter *Build and deployment* bei *Source* **„GitHub Actions“** wählen.
7. Tab **Actions** abwarten (grüner Haken, ~1 Min). Fertig.

**Deine URL:** `https://DEIN-GITHUB-NAME.github.io/gymtrack-marketing/`
(steht auch unter Settings → Pages).

> Wichtig: Repo darf **Private** sein — die veröffentlichte Seite ist trotzdem
> öffentlich erreichbar (nur der Code bleibt privat). Wer die App komplett privat
> will, nimmt Weg B mit Passwortschutz.

### Änderungen später veröffentlichen

Wenn ich (Claude) etwas am Tool ändere: in GitHub Desktop **Commit** + **Push** —
der Workflow baut und veröffentlicht automatisch neu. Nichts weiter zu tun.

## Weg B — Vercel (auch kostenlos, Alternative)

1. Repo wie oben zu GitHub pushen (Schritte 1–5).
2. Auf https://vercel.com mit GitHub anmelden → **Add New → Project** →
   Repo importieren → **Deploy** (Vercel erkennt Vite automatisch).
3. Du bekommst sofort eine URL wie `gymtrack-marketing.vercel.app`.
   Passwortschutz möglich (Project → Settings → Deployment Protection).

## Schnelltest ohne Account (30 Sekunden, nicht dauerhaft)

```
npm run build
```
Erzeugt den Ordner `dist/`. Diesen Ordner auf https://app.netlify.com/drop ziehen →
sofort eine Test-URL. Gut zum Vorzeigen, aber nicht als feste Adresse gedacht.

---

Fragen zum Einrichten? Sag Bescheid, ich gehe die Schritte mit dir durch.
