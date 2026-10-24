# Fasan-Karte

Reisekarte für Gruppen, die im Handy-Browser läuft, ohne Installation. Erste Reise: Lissabon, 24.–26. Oktober 2026.

Die Karte zeigt die Tagespläne mit nummerierten Stopps, den eigenen Standort und alle Orte zum freien Erkunden. „Starten“ und „Route“ übergeben das Ziel an Google Maps oder Apple Karten, die dann zu Fuß navigieren.

## Aufbau

| Datei | Zweck |
|---|---|
| `data/orte.csv` | Alle Orte: Name, Adresse, Kategorie, Notiz, optional Lat/Lon |
| `site/plaene.json` | Tagespläne, die auf Ortsnamen aus der CSV verweisen |
| `site/orte.json` | Wird automatisch erzeugt: Orte mit Koordinaten |
| `tools/geocode.py` | Holt Koordinaten bei OpenStreetMap Nominatim (1 Anfrage/s) |
| `.github/workflows/pages.yml` | Bei jedem Push: Koordinaten holen, Leaflet einbinden, auf GitHub Pages veröffentlichen |

## Ort hinzufügen oder korrigieren

1. `data/orte.csv` auf GitHub bearbeiten und eine Zeile anhängen.
2. Liegt ein Punkt falsch, die Spalten `Lat` und `Lon` von Hand füllen (zum Beispiel aus openstreetmap.org per Rechtsklick „Adresse anzeigen“).
3. Speichern. Nach ein bis zwei Minuten ist die Karte aktuell.

## Datenschutz

Die Seite ist öffentlich. Deshalb steht die Adresse der Unterkunft nicht im Repo; jeder trägt sie in der App unter „Tipps“ ein, gespeichert nur auf dem eigenen Handy. Der Standort wird nur im Browser verwendet und nirgendwohin gesendet. Kartenbilder kommen von OpenStreetMap.

Kartendaten © OpenStreetMap-Mitwirkende (ODbL). Karte mit [Leaflet](https://leafletjs.com).
