# Minute Chime (Next.js iOS PWA)

Eine hochpräzise, minimalistische Web-Anwendung mit **Next.js (App Router, TypeScript, Tailwind CSS)**, die die aktuelle Uhrzeit mit einem animierten Sekunden-Ring anzeigt und zu jeder vollen Minute (`:00` Sekunden) einen Signalton abspielt.

Speziell optimiert für die Nutzung als **Home-Screen Web-App (PWA) auf dem iPhone**.

## Features & Architektur

- **Exakte Systemzeit-Synchronisation (`usePreciseClock`):** Drift-freier Timer, der sich nach jeder Sekunde exakt auf `1000 - (Date.now() % 1000)` nachsynchronisiert und genau einmal pro voller Minute auslöst.
- **Dual iOS Keep-Alive (`Screen Wake Lock` + `Silent Audio Loop`):**
  - Hält das iPhone-Display über `navigator.wakeLock` im stromsparenden OLED-Dark-Mode wach.
  - Erzeugt im Arbeitsspeicher einen lautlosen Audio-Loop (`<audio loop>` + `navigator.mediaSession`), damit iOS die App als aktiven Medien-Stream einstuft und der Minutenton auch bei gesperrtem Bildschirm weiterläuft.
- **Multi-Profil Web Audio Synthesizer (`src/lib/audio-engine.ts`):**
  - **Digital-Piep:** Klassischer Casio-Doppelpiep (1046.5 Hz).
  - **Zen-Glocke:** Sanfter, harmonischer Gong (528 Hz + Oberton).
  - **Dezenter Klick:** Kurzer Akustik-Impuls für fokussiertes Arbeiten.
- **Persistente Einstellungen (`localStorage`):** Speichert Klangprofil und Lautstärke direkt auf dem Gerät.

## Lokale Entwicklung & Test auf dem iPhone

```bash
# Entwicklungsserver starten
npm run dev
```

Öffne `http://localhost:3000` im Browser. Um die App direkt auf deinem iPhone im selben WLAN zu testen oder auf Vercel zu deployen:
1. Öffne die URL in **Safari auf dem iPhone**.
2. Tippe unten auf **Teilen** -> **Zum Home-Bildschirm**.
3. Öffne **Minute Chime** vom iPhone-Startbildschirm und tippe auf **Signalton aktivieren**.
