# Entscheidungen – Fasan Karte

Neueste oben. Format: Datum · Entscheidung · Grund. Familienweite Regeln stehen in `CUK999/Fasan`.

| Datum | Entscheidung | Grund |
| --- | --- | --- |
| 2026-10-24 | Gruppen-Abgleich ohne Server: Paket (Stimmen, Umfragen, Namen) komprimiert im Link-Teil hinter „#“, verteilt per QR-Code (Handy-Kamera) oder WhatsApp; jedes Paket trägt alles Bekannte, Zusammenführen je Person nach Zeitstempel | Live-P2P im Browser braucht Vermittler und scheitert oft im Mobilfunk; „#“-Teil erreicht den Server nicht |
| 2026-10-24 | Später automatischer Abgleich über eigenen Nostr-Relay auf dem VPS, Ende-zu-Ende-verschlüsselt, Kopplung per QR | Fasan: P2P oder offene Netze; wartet auf stabilen VPS |
| 2026-10-24 | Web-App auf GitHub Pages (öffentlich), ohne Installation, ohne Server; Unterkunft nie im Repo | Muss in Stunden auf Android und iPhone laufen; VPS bleibt unangetastet |
| 2026-10-24 | Karte: Leaflet + OpenStreetMap-Kacheln; Navigation per Übergabe an Apple Karten, Google Maps oder Geo-Link | Turn-by-turn im Browser ist unzuverlässig (Display aus = kein GPS) |
| 2026-10-24 | Orte aus `data/orte.csv`; GitHub Action prüft jede Position gegen OSM-Name, OSM-Adresse und Wikidata und schreibt `data/pruefbericht.md` | Drei Orte lagen falsch; jede Position braucht eine zweite Quelle |
| 2026-10-24 | Infos aus OSM (Öffnungszeiten, Webseite, Zugang), Text aus Wikipedia, Bilder nur von Wikimedia Commons mit freier Lizenz und Namensnennung | Fasan-Regel für Bilder: gemeinfrei, CC0, CC BY, CC BY-SA |
| 2026-10-24 | Markierungen (Merken, Erledigt, Ausblenden, Notiz, Sterne) nur im Gerät; Austausch per Text (z. B. WhatsApp) | Fasan: keine Konten, keine eigenen Server |
| 2026-10-24 | Bedienung unten (Leiste + Blatt in drei Höhen), Ziele ≥ 60 px, Profile Standard/Einfach/Gut lesbar, Themes System/Hell/Dunkel/Kontrast/Glas | Fasan-Grundsätze; Recherche `docs/recherche/2026-10-24-karten-ux.md` |
| 2026-10-24 | Live-Standort vorerst nicht; später Traccar Client als Übergang, Ziel: QR-Gruppe mit Ende-zu-Ende-Verschlüsselung | Browser kann im Hintergrund keinen Standort senden (WebKit) |
