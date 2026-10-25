# Höhendaten und Höhenmeter für Fußwege in Lissabon

Stand: 24./25.10.2026. Frage: Welche Höhendaten und welches Rechenverfahren liefern für Fußwege in Lissabon belastbare Höhenmeter? Lizenz und Zugriff aus GitHub Actions müssen geklärt sein.

Schreibweise: **Beleg** = steht in der genannten Quelle. **Folgerung** = mein Schluss daraus. „nicht geprüft“ = nicht belegt.

**Zwischenstand:** Datei wurde früh gesichert. Teil 3 (Rechenverfahren) und einige Zahlen werden noch ergänzt. Abschnitte mit „OFFEN“ sind unvollständig.

---

## Kurzfassung

### Empfehlung (Folgerung)

1. **Höhenraster aus Copernicus DEM GLO-30**, im Bauprozess aus dem AWS-Bucket `copernicus-dem-30m` geholt. Kein Konto nötig. Lizenz frei, Namensnennung Pflicht.
2. **Ein Kachel-Download genügt.** Ganz Lissabon liegt in der Kachel `Copernicus_DSM_COG_10_N38_00_W010_00_DEM` (Lage 38–39 N, 10–9 W).
3. **Ausschnitt im Bauprozess schneiden** (z. B. 38,66–38,80 N, −9,45 bis −9,08 E), als Int16 speichern, komprimiert ausliefern: **ca. 1,3 MB roh, deutlich kleiner komprimiert** (Messung siehe Abschnitt 4). 10 m Auflösung bringt keine neue Information, weil die Quelle 30 m hat.
4. **Rechnung auf dem Gerät** entlang des echten Wegs (Valhalla-Polylinie, die die App ohnehin schon lädt): gleichmäßig abtasten, glätten, Schwelle/Hysterese. Keine zusätzliche Koordinate geht an einen Dienst.
5. **Nicht empfohlen:** Open-Meteo Elevation (nur 90 m, Koordinaten in Server-Logs, Limits), SRTM (älter, gleiche Auflösung, kein Vorteil), DGT-LiDAR im Bauprozess (Konto und Login nötig). DGT-LiDAR eignet sich als einmalige, manuelle Prüf- oder Veredelungsquelle.
6. **Grenze:** Copernicus ist ein Oberflächenmodell (DSM). Gebäude, Bäume und die 30-m-Pixel glätten Treppen und enge Gassen. Erwartung: Gesamtanstieg einer 1–2-km-Strecke ungefähr richtig, einzelne steile Gassen zu flach. Genauer geht es nur mit dem DGT-Geländemodell (2 m, offen, aber mit Konto).

### Genaue URLs (Beleg, Zugriff am 24.10.2026)

- AWS-Registry: https://registry.opendata.aws/copernicus-dem/
- Bucket GLO-30: `s3://copernicus-dem-30m` (ARN `arn:aws:s3:::copernicus-dem-30m`, Region `eu-central-1`); GLO-90: `s3://copernicus-dem-90m`.
- Zugriff ohne Konto: `aws s3 ls --no-sign-request s3://copernicus-dem-30m/` (Registry: „No AWS account required“).
- Schlüsselmuster (Beleg, Forum Sentinel Hub, anderes Beispiel): `Copernicus_DSM_COG_10_N00_00_E006_00_DEM/Copernicus_DSM_COG_10_N00_00_E006_00_DEM.tif`
- **Folgerung, nicht getestet:** `https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/Copernicus_DSM_COG_10_N38_00_W010_00_DEM/Copernicus_DSM_COG_10_N38_00_W010_00_DEM.tif`. Mein Sitzungs-Proxy hat den Host gesperrt (403), ich konnte die Datei nicht abrufen. Größe der Kachel: nicht geprüft.
- Doku des Buckets: https://copernicus-dem-30m.s3.amazonaws.com/readme.html (nicht lesbar für mich)
- STAC: https://copernicus-dem-30m-stac.s3.amazonaws.com/

### Lizenztexte (Beleg: ESA-Lizenz COP-DEM-GLO-30-F)

Quelle: https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf (Wortlaut über Werkzeug-Auszug; vor Veröffentlichung das PDF selbst gegenlesen).

- Art. 3: Rechte weltweit und „without limitation in time“.
- Art. 5: „The use rights granted under this licence are free of charge to the User.“
- Art. 4: Vervielfältigen, Verbreiten, öffentlich zugänglich machen, Anpassen und Kombinieren erlaubt. „Commercial“ kommt im Text nicht vor; es gibt keine Nutzungs-Einschränkung nach Zweck.
- **Art. 6(a) Quellenhinweis bei Weitergabe:** „© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.“
- **Art. 6(b) bei angepassten Daten:** „produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved“
- **Art. 6(c) Haftungssatz für Weitergebende:** „The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.“
- Art. 6(d): keine Behauptung, die Tätigkeit sei von Copernicus gebilligt. Art. 6(e): Folgenutzer an dieselben Pflichten binden. Art. 7: „as is“. Verstoß erlaubt dem Lizenzgeber die Kündigung.
- **Folgerung:** Unser Raster ist „angepasst“ (zugeschnitten, umgerechnet). Wir brauchen den Hinweis 6(b) und den Haftungssatz 6(c) in der App unter „Quellen“, dazu den AWS-Zitierhinweis: „Copernicus Digital Elevation Model (DEM) was accessed on `DATE` from https://registry.opendata.aws/copernicus-dem.“ (Beleg: Registry-Seite). Zitier-DOI: https://doi.org/10.5270/ESA-c5d3d65.
- Hinweis zur Weiterverbreitung: Die Lizenz ist keine freie Lizenz im Sinne von FOSS-Definitionen (Pflichten wie 6(e), Kündigungsrecht). Sie ist kostenlos und erlaubt Weitergabe. Ob das in das Repo-Prinzip „MPL-2.0 / FOSS-Community zuerst“ passt, ist eine Entscheidung für das Repo. **Folgerung:** Das Raster als Daten-Datei mit eigener Quellenangabe führen, nicht als MPL-Code.

---

## 1. Datenquellen im Vergleich

| Quelle | Typ | Auflösung | Lizenz | Zugriff aus Actions | Eignung |
|---|---|---|---|---|---|
| Copernicus DEM GLO-30 | DSM | 1″ (ca. 30,8 × 24,2 m bei 38,7° N) | frei, Namensnennung Pflicht | AWS S3, ohne Konto | **beste Wahl** |
| Copernicus DEM GLO-90 | DSM | 3″ (ca. 90 × 73 m) | wie GLO-30 | AWS S3, ohne Konto | zu grob |
| SRTM (GL1 v3) | DSM, Radar Feb. 2000 | 1″ | nicht geprüft (OFFEN, NASA-Seite) | nicht geprüft | kein Vorteil |
| Valhalla/AWS „skadi“ | SRTM-Format, Mischung | 1″ | Joerd-Attribution | S3 öffentlich | nur falls Valhalla-Daten gebraucht |
| DGT LiDAR MDT/MDS | MDT = Gelände, MDS = Oberfläche | 0,5 m und 2 m | CC BY 4.0 | **Konto + Login nötig** | beste Genauigkeit, nicht automatisierbar |
| Open-Meteo Elevation | DSM (Copernicus GLO-90) | 90 m | CC BY 4.0, frei nur nicht-kommerziell | HTTP-API | nein |
| FABDEM | „Gelände“, aus Copernicus abgeleitet | 1″ | „nicht-kommerziell“ (Beleg Artikel) | nicht geprüft | nein (FOSS-Grundsatz) |

### 1.1 Copernicus DEM

**Beleg (ESA, https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM):**
- „Digital Surface Model (DSM) which represents the top-reflective surface of the Earth“ (Gebäude, Infrastruktur, Vegetation enthalten).
- Absolut vertikal „< 4m (90% linear error)“.
- Relativ „< 2m for slopes below or equal 20%“ und „< 4m for slopes above 20%“ (90 % punkt-zu-punkt innerhalb 1° × 1°).
- Horizontal „< 6m (90% circular error)“.
- Höhen in EGM2008 (EPSG:3855), Meter. Pixelregistrierung „RasterPixelIsPoint“.
- GLO-30: 1,0″ Rasterweite (DGED). Wasserflächen eingeebnet, Flüsse konsistent, Küsten und Flughäfen editiert.
- Lizenz GLO-30 und GLO-90: „available worldwide with a free license“.
- Freigaben 2019_1 bis 2024_1.

**Beleg (Google Earth Engine, https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1):** Basis ist TanDEM-X-Radar, Aufnahmezeit 1.12.2010 bis 13.11.2020. Es ist ein DSM, abgeleitet vom bearbeiteten WorldDEM.

**Beleg (AWS-Registry):** „The Copernicus DEM is a Digital Surface Model (DSM)“; GLO-30 Public („limited worldwide coverage“, einzelne Länder fehlen); Cloud Optimized GeoTIFF; Verwalter Sinergise; Aktualisierung „None, except GLO-30 Public can be updated if the public tile list changes“. Eintrag im Registry-YAML: „Copernicus DEM 2021 release“ (https://github.com/awslabs/open-data-registry/blob/main/datasets/copernicus-dem.yaml).

**Beleg (Forum, https://forum.sentinel-hub.com/t/copernicus-dem-data-available-on-aws/3027):** Beispielkachel Float32, DEFLATE, Blöcke 1024 × 1024, Höhen EGM2008. Namensgebung nach der südwestlichen Ecke.

**Folgerung:** Portugal-Kacheln sind in GLO-30 Public sehr wahrscheinlich enthalten (die Registry nennt „einzelne Länder“ ohne Portugal, die Liste selbst habe ich nicht gelesen: nicht geprüft). Die Kachel `N38_00_W010_00` deckt Lissabon vollständig ab, weil die Kachel von 10° W bis 9° W und von 38° N bis 39° N reicht.

**Fehler in Städten (Beleg):**
- FABDEM-Artikel (Hawker u. a., Environmental Research Letters 2022, https://iopscience.iop.org/article/10.1088/1748-9326/ac4d4f): Gegenüber LiDAR-Geländemodellen aus 12 Ländern liegt der mittlere absolute Fehler (MAE) von Copernicus GLO-30 **in bebauten Flächen bei 1,61 m**, mit mittlerer Abweichung (Bias) **+0,86 m** (zu hoch). Wald südlich 52° N: MAE 5,15 m, Bias +2,93 m. Nach Entfernen von Gebäuden und Wäldern (FABDEM): bebaut 1,12 m MAE, Bias −0,08 m.
- ISPRS 2024 (https://isprs-archives.copernicus.org/articles/XLVIII-4-W9-2024/275/2024/): Für Kapstadt senkt eine Korrektur die RMSE von Copernicus um „46–53 %“, besonders in Stadtgebieten. Absolute Werte stehen im Kurztext nicht.
- **Folgerung:** Die Werte sind globale Mittel über bebaute Flächen, nicht für Lissabons Altstadt. Sie sagen etwas über die Höhe, nicht direkt über Anstieg. Für die Altstadt mit 3–6 Stockwerken hohen Häusern an engen Gassen ist ein größerer lokaler Fehler plausibel (nicht belegt). Der Bias von +0,86 m kürzt sich bei Höhenunterschieden weitgehend heraus; Rauschen und Gebäudekanten nicht.

### 1.2 SRTM

**Beleg (Joerd-Doku, https://github.com/tilezen/joerd/blob/master/docs/data-sources.md, Repo-Stand 2017):** „SRTM globally except high latitudes, 30 meters (90 meters nominal quality) in land areas“. Skadi-Kacheln sind „Essentially … the SRTMGL1 format tiles but with global coverage“, 16-Bit, Big-Endian, Voids −32768, Höhen auf EGM96 (https://github.com/tilezen/joerd/blob/master/docs/formats.md).

**OFFEN:** NASA-Seiten zu SRTM v3 (Genauigkeit, Lizenz). Suchtreffer: https://www.earthdata.nasa.gov/news/nasa-shuttle-radar-topography-mission-srtm-version-3.0-global-1-arc-second-data-released-over (nicht gelesen).

**Folgerung:** SRTM ist wie Copernicus ein Oberflächenmodell (Radar), stammt aber von 2000, hat dieselbe Rasterweite und keinen Zugriffsvorteil.

### 1.3 DGT (Portugal), LiDAR-Geländemodell

**Beleg (DGT-Webinar vom 15.7.2025, https://www.dgterritorio.gov.pt/sites/default/files/ficheiros-artigos/Apresentacoes/2025/5-Webinar_LiDAR_15jul2025.pdf):**
- Abdeckung „Portugal continental“, Projekt PRR (RE-C08-i02). Lissabon wird nicht einzeln genannt.
- Punktdichte „Densidade Média: 10 pontos/ m2“.
- Produkte: MDT (Gelände) und MDS (Oberfläche) mit 0,5 m und 2 m, Punktwolke LAZ (LAS 1.4).
- „Exatidão altimétrica: 10 cm“; Lagegenauigkeit 30 cm.
- Lizenz **CC-BY-4.0**, „Dados abertos de acesso publico sem restrições“.
- Plattform https://cdd.dgterritorio.gov.pt/ : Ansehen frei, **Download nur nach Registrierung**. Kacheln 1 km × 1 km. API für die zweite Version „im letzten Quartal 2025“ angekündigt. Ob sie heute läuft: nicht geprüft.

**Beleg (Hydrographisches Institut, https://www.hidrografico.pt/en/news/noticias-do-antigo-site/data-deliver-of-the-general-of-territorie-are-available/):** Flüge 2024, gesamtes Festland, Punktwolke 10 Punkte/m², MDT/MDS als GeoTIFF mit 50 cm und 2 m. Frei über SNIG und DGT-Datenplattform.

**Beleg (GMT.jl-Doku, https://www.generic-mapping-tools.org/GMTjl_doc/tutorials/dgt_lidar/dgt_lidar.html):** Sammlungen MDS-2m, MDT-2m, MDS-50cm, MDT-50cm, LAZ. Kachelnamen z. B. `MDS-50cm-124170-06-2024.tiff`. Projektion ETRS89/PT-TM06 (EPSG:3763). Download-Pfad `https://cdd.dgterritorio.gov.pt/dgt-be/v1/download/...`. Registrierung nötig.

**Beleg (QGIS-Plugin-Quelltext, https://github.com/qgispt/dgtcd_downer, Stand 19.5.2026):**
- STAC-Suche: `POST https://cdd.dgterritorio.gov.pt/dgt-be/v1/search` mit JSON `{"bbox":[...],"limit":1000,"collections":[...]}`; Sammlungsnamen z. B. `LAZ`, `MDT-50cm`.
- Anmeldung über OpenID Connect: `https://auth.cdd.dgterritorio.gov.pt/realms/dgterritorio/protocol/openid-connect`, Client `aai-oidc-dgt`. Das Plugin füllt dazu das Anmeldeformular aus (Benutzername, Passwort). Das ist kein dokumentierter Maschinenzugang.
- Weboberfläche: Bereiche bis 200 km².
- Das Plugin ist „community-developed and not affiliated with the DGT“ (QGIS-Plugin-Seite https://plugins.qgis.org/plugins/dgt_cdd_downloader/).

**Beleg (dados.gov.pt, https://dados.gov.pt/en/datasets/modelo-digital-do-terreno-resolucao-2-m-zonas-costeiras-de-portugal-continental-2014-2015):** Älterer MDT 2 m der Küstenzonen 2014–2015, Lizenz CC BY 4.0. Räumlicher Umfang im Datensatz nicht angegeben, ob Lissabon dazugehört: nicht geprüft. Keine Download-URLs auf der Seite.

**Folgerung:**
- Das MDT ist ein Geländemodell (ohne Gebäude). Das passt für Straßen deutlich besser als ein DSM. Brücken und Viadukte erscheinen im MDT als Boden unter der Brücke (nicht geprüft für Lissabon; so ist es bei MDT üblich).
- Für **GitHub Actions ungeeignet**: Konto nötig, Login per Formular, Zugangsdaten als Secret, dokumentierte API unsicher. Wenn man es will: einmal lokal mit eigenem Konto holen, auf 5–10 m verkleinern, ins Repo legen. CC BY 4.0 erlaubt das mit Namensnennung. Der genaue DGT-Namenstext: nicht geprüft.
- 2-m-Daten für ganz Lissabon sind zu groß: 500 km² bei 2 m = 125 Mio. Zellen (Abschnitt 4).

### 1.4 Open-Meteo Elevation API

**Beleg (https://open-meteo.com/en/docs/elevation-api):**
- Endpunkt `https://api.open-meteo.com/v1/elevation?latitude=..&longitude=..`; „Up to 100 coordinates can be requested at once“.
- Quelle: **Copernicus DEM 2021 release GLO-90, 90 m**.
- Antwort `{"elevation":[…]}`. Fehler: HTTP 400 mit `error`/`reason`.
- Namensnennung: „clear attribution to the Copernicus program as well as a reference to Open-Meteo“. Kommerziell nur mit API-Key.

**Beleg (https://open-meteo.com/en/terms):** Frei nur nicht-kommerziell. Limits pro IP: 600/Minute, 5 000/Stunde, 10 000/Tag, 300 000/Monat. Missbrauch kann ohne Vorwarnung gesperrt werden. Webserver-Logs „may contain sensitive information such as geographical coordinates“, Löschung nach 90 Tagen. Keine Gewähr.

**Folgerung:** 90 m ist für Gassen zu grob. Für die Handys widerspricht es der Datenschutz-Regel (Koordinaten in Logs). Im Bauprozess ginge es (die Wetter-Abfrage tut das schon), bringt aber nichts, was die AWS-Kachel nicht besser liefert.

### 1.5 FABDEM (Gelände aus Copernicus, nur zur Einordnung)

**Beleg (ERL-Artikel):** Daten „freely available for non-commercial use“. Ob zusätzlich ShareAlike gilt: nicht geprüft. Der Datensatz-Eintrag in der GKHub-Liste zeigt CC BY 4.0, gehört aber zum Artikel, nicht zum Datensatz.
**Folgerung:** „Nicht-kommerziell“ passt nicht zum FOSS-Grundsatz. Nicht verwenden.

### 1.6 Lissabon-Stadtdaten (CML)

OFFEN: Gibt es ein offenes Geländemodell der Câmara Municipal de Lisboa (dados.cm-lisboa.pt)? Nicht geprüft.

---

## 2. Valhalla

Geprüft im Quelltext: Repo https://github.com/valhalla/valhalla, Stand Commit `618cad5eb6a12c7787c3480851eda07c99eb5c74` vom 19.10.2026, lokal geklont und per grep gelesen.

### 2.1 Route-API und `elevation_interval`

**Beleg (docs/docs/api/route/api-reference.md, Zeile 370):** „Elevation interval (meters) for requesting elevation along the route. Valhalla data must have been generated with elevation data. If no `elevation_interval` is specified, no elevation will be returned for the route. An elevation interval of 30 meters is recommended when elevation along the route is desired, matching the default data source's resolution.“

**Beleg (Zeile 440 und `src/tyr/route_serializer_valhalla.cc`, Z. 576–589):** Bei gesetztem `elevation_interval` liefert **jede Etappe** (`trip.legs[i]`) zwei Felder:
- `elevation_interval` (Meter, bei `units=miles` in Fuß),
- `elevation` (Array von Höhen, eine Nachkommastelle, im Abstand `elevation_interval` entlang der Etappe).

**Beleg:** In Doku und Quelltext gibt es **keine Summe für Anstieg/Abstieg** (Suche nach ascent/descent/gain ohne Treffer in der Ausgabe). Die Summen müsste die App selbst aus dem Array bilden.

### 2.2 `/height`

**Beleg (docs/docs/api/elevation.md):**
- Aktion `/height`. Eingabe `shape` (Liste `{lat,lon}`) **oder** `encoded_polyline` (mit `shape_format` = `polyline6`|`polyline5`, Standard polyline6).
- `range` (bool): bei `true` kommt `range_height` = `[[Strecke_m, Höhe], …]`, sonst `height` = `[Höhe, …]`. Höhe ist `null`, wenn keine Daten da sind.
- `resample_distance` (Meter): Eingabe wird gleichmäßig neu abgetastet.
- `height_precision` 0, 1 oder 2 (Standard 0 = ganze Meter, führt zu „Treppenstufen“).
- `id`, `warnings`.
- Datenquelle laut Doku: „Amazon Web Services Public Datasets“ (Terrain Tiles).

### 2.3 Welche Höhendaten benutzt Valhalla?

**Beleg:**
- `scripts/valhalla_build_elevation` lädt `https://elevation-tiles-prod.s3.us-east-1.amazonaws.com/skadi/{N|S}yy/{N|S}yy{E|W}xxx.hgt.gz`.
- `src/skadi/sample.cc`: Kacheln mit 3601 × 3601 Werten (1″ = ca. 30 m), bilineare Interpolation, Voids als „no data“.
- Joerd-Doku: Skadi = SRTMGL1-Format, zusammengesetzt aus mehreren Quellen. Für Europa nennt die Quellenliste EU-DEM (30 m, Portugal enthalten), die Zoom-Tabelle führt für die höchsten Zoomstufen aber SRTM auf. Welche Quelle in Lissabon tatsächlich im 1″-Raster steckt: nicht geprüft (die Footprint-Datenbank würde das zeigen).
- Attribution bei Höhendaten laut Valhalla-Doku (docs/docs/contributing/data/attribution.md): „© OpenStreetMap contributors, U.S. Geological Survey, and U.S. National Oceanic and Atmospheric Administration“.

### 2.4 Wie wirkt `use_hills` bei Fußgängern?

**Beleg (src/mjolnir/elevationbuilder.cc, src/skadi/util.cc, src/sif/pedestriancost.cc):**
- Beim Bau der Kacheln wird jede Kante alle **60 m** abgetastet (`POSTING_INTERVAL = 60`). Daraus entstehen „weighted grade“ (Stufe 0–15, 6 = eben), größte Steigung/Gefälle und mittlere Höhe.
- Kanten kürzer als 10 m behalten Standardwerte. Brücken/Tunnel werden linear interpoliert und auf ±3 % begrenzt.
- Fußgänger-Kosten: `grade_penalty[stufe] = (1 − use_hills) × kAvoidHillsStrength[stufe]`; zusätzlich ein Geschwindigkeitsfaktor je Stufe (`kGradeBasedSpeedFactor`). Standard `use_hills` = 0,5 (Doku Z. 243).
- Jede Kante mit weniger als 60 m Länge hat kaum Messpunkte. In Lissabons Altstadt (kurze Kanten, Treppen) ist das grob.
- Wirkt nur, wenn die Kacheln mit Höhendaten gebaut wurden („Valhalla data must have been generated with elevation data“).

### 2.5 Hat valhalla1.openstreetmap.de Höhendaten? Wirkt `use_hills` dort?

**Beleg:**
- Valhalla-README/Doku: FOSSGIS e.V. betreibt einen öffentlichen Demo-Server mit „full planet graph“ (https://github.com/valhalla/valhalla, README Z. 55; docs/docs/start/introduction.md Z. 5). Fair-Use, Rate-Limits (Verweis auf https://github.com/valhalla/valhalla/discussions/3373, nicht gelesen).
- Die Demo-Oberfläche valhalla.openstreetmap.de (Repo https://github.com/gis-ops/valhalla-app, Stand 22.10.2026) nutzt `VITE_VALHALLA_URL=https://valhalla1.openstreetmap.de` und baut `/height`-Anfragen (`buildHeightRequest`: `range`, `shape`, `id`) für eine Höhenprofil-Grafik (`src/components/heightgraph.tsx`).
- Forum (https://community.openstreetmap.org/t/neue-routing-engine-valhalla/7204, Beitrag von „whb“ am 23.12.2022): „Das Höhenprofil wird auch berücksichtigt.“ Ohne Quelle, ohne Datenangabe.

**Nicht geprüft:** ob der Server die Kacheln mit Höhendaten gebaut hat, welche Daten das sind, ob `use_hills` dort Wirkung hat, ob `elevation_interval` Zahlen statt Fehler liefert. Ich konnte den Server nicht abfragen (Proxy sperrt den Host).

**Folgerung:** Wahrscheinlich ja, weil die Demo-Oberfläche das Höhenprofil anzeigt. Beweis fehlt. **So prüft ihr es in einer Minute (vom eigenen Rechner):**
```
curl -s https://valhalla1.openstreetmap.de/height --data '{"range":true,"height_precision":1,"shape":[{"lat":38.7075,"lon":-9.1364},{"lat":38.7139,"lon":-9.1334}]}'
```
Zahlen in `range_height` = Höhendaten vorhanden; `null` = keine. Für `use_hills`: dieselbe Route (Baixa → Castelo) mit `use_hills` 0 und 1 anfordern; unterschiedliche Länge oder Form = wirkt.

---

## 3. Rechenverfahren für Höhenmeter

OFFEN: Belege zu Komoot, Strava, Garmin und OSM-Werkzeugen (Schwellen, Glättung) werden ergänzt.

---

## 4. Rastergröße für Lissabon

Rechnung (Python, WGS84-Formeln, lokal; Skript `groesse.py` im Arbeitsordner der Sitzung). Mittelbreite 38,73° N: 1° Breite = 111 010 m, 1° Länge = 86 955 m.

**Bereich der Anfrage** 38,66–38,80 N, −9,45 bis −9,08 E: 15,5 km (N–S) × 32,2 km (O–W) = **500 km²**.

| Auflösung | Zellen (Spalten × Zeilen) | Int16 roh |
|---|---|---|
| 10 m | 3218 × 1555 = 5 003 990 | 10,0 MB |
| 25 m | 1287 × 622 = 800 514 | 1,60 MB |
| 30 m | 1073 × 519 = 556 887 | 1,11 MB |
| GLO-30 nativ (1″ × 1″ = 30,8 × 24,2 m) | 1332 × 504 = 671 328 | 1,34 MB |
| GLO-90 nativ (3″) | 444 × 168 = 74 592 | 0,15 MB |

Der Bereich reicht weit nach Westen (bis Cascais/Sintra-Küste). **Kern Lissabon** (Schätzung 38,68–38,80 N, −9,25 bis −9,08 E): 13,3 × 14,8 km = 197 km², GLO-30 nativ 612 × 432 = 264 384 Zellen = 0,53 MB roh.

OFFEN: Messung der Kompression (zlib/xz/brotli, mit Differenzbildung) an synthetischen Daten. Echte Copernicus-Kacheln konnte ich nicht laden.

---

## 5. Empfehlung mit Grenzen

OFFEN: wird nach Teil 3 vervollständigt.

---

## Quellenliste

Zugriff am 24.10.2026, soweit nicht anders vermerkt.

- Copernicus-Lizenz GLO-30/GLO-90: https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf
- Ältere Fassung der GLO-30-Lizenz: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf
- ESA COP-DEM-Seite: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- AWS Registry: https://registry.opendata.aws/copernicus-dem/ ; YAML https://github.com/awslabs/open-data-registry/blob/main/datasets/copernicus-dem.yaml
- Earth Engine GLO-30: https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1
- Sentinel-Hub-Forum: https://forum.sentinel-hub.com/t/copernicus-dem-data-available-on-aws/3027 ; https://forum.sentinel-hub.com/t/how-to-get-copernicus-dem-geotiffs-for-a-bounding-box-using-python/4418
- FABDEM/ERL 2022: https://iopscience.iop.org/article/10.1088/1748-9326/ac4d4f
- ISPRS 2024 (Kapstadt): https://isprs-archives.copernicus.org/articles/XLVIII-4-W9-2024/275/2024/
- DGT-Webinar: https://www.dgterritorio.gov.pt/sites/default/files/ficheiros-artigos/Apresentacoes/2025/5-Webinar_LiDAR_15jul2025.pdf
- Hydrographisches Institut: https://www.hidrografico.pt/en/news/noticias-do-antigo-site/data-deliver-of-the-general-of-territorie-are-available/
- GMT.jl DGT-LiDAR: https://www.generic-mapping-tools.org/GMTjl_doc/tutorials/dgt_lidar/dgt_lidar.html
- QGIS-Plugin DGT: https://plugins.qgis.org/plugins/dgt_cdd_downloader/ ; Quelltext https://github.com/qgispt/dgtcd_downer
- dados.gov.pt MDT Küste: https://dados.gov.pt/en/datasets/modelo-digital-do-terreno-resolucao-2-m-zonas-costeiras-de-portugal-continental-2014-2015
- Open-Meteo: https://open-meteo.com/en/docs/elevation-api ; https://open-meteo.com/en/terms
- Valhalla (Quelltext, Doku): https://github.com/valhalla/valhalla (Commit 618cad5, 19.10.2026)
- Valhalla-Demo-App: https://github.com/gis-ops/valhalla-app (Commit 699e32f, 22.10.2026)
- Joerd/Terrain Tiles: https://github.com/tilezen/joerd (docs/data-sources.md, formats.md, attribution.md) ; https://registry.opendata.aws/terrain-tiles
- OSM-Forum Valhalla: https://community.openstreetmap.org/t/neue-routing-engine-valhalla/7204
- OSM-Wiki Valhalla: https://wiki.openstreetmap.org/wiki/Valhalla (keine Aussage zu Höhen)

## Was ich nicht erreichen konnte

- Mein Sitzungs-Proxy hat 403 geliefert für `copernicus-dem-30m.s3.amazonaws.com`, `raw.githubusercontent.com` und `valhalla1.openstreetmap.de`. Ich habe nicht umgangen, sondern andere Wege genutzt (Git-Klone, Seitenabruf).
- Folge: Kachelgröße, echte Kompression und Antworten von valhalla1 sind **nicht geprüft**.
