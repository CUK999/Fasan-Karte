# Bon-Protokoll und gefundene Fehlerursachen (31.10.2026, Version 3.17)

Anlass: Handy-Test REWE 3 (3 von 5 Posten, Hand sichtbar, nicht begradigt, „AEUTERQUARK“), Vorwurf „UVDoc bewirkt nichts“.

## Protokoll in der App
- Jede Erkennung schreibt ein Protokoll: App-/bon.js-Version, Gerät (Browser, Speicher, Kerne, Bildschirm), Motor
  (Worker oder direkt), Fotogröße, jeder Durchlauf (Name, Güte, Dauer, Wortzahl, Anteil sicherer Wörter, Posten,
  Summe, geprüft, gelesene Zeilen), UVDoc (geladen, Dauer, Ein-/Ausgabegröße), Glätten (Stärke), Ergebnis
  (Gewinner, Posten mit Betrag, alle Zeilen mit Einordnung), alle Fehler (vorher stillschweigend verschluckt),
  Seitenfehler, Vorschaubilder jedes Durchlaufs und des angezeigten Bilds.
- Liegt im Gerät (IndexedDB), die letzten 5. „Mehr → Bon-Protokolle → Teilen mit Foto / ohne Foto“ (Teilen-Menü,
  sonst Download als JSON). Nichts geht automatisch weg.
- Versionsmarke unten links auf jeder Seite; rot mit „!“, wenn bon.js aus einem alten Zwischenspeicher kommt.

## Ursachen, die das Protokoll sofort zeigte (Testrechner, gleiches Foto)
1. **UVDoc lief, verlor aber jedes Mal.** Das entfaltete Bild ist flach und ohne Hand, wurde aber in der Größe des
   verkleinerten Fotos ausgegeben (Bon nur ~800 px breit) → Erkennung las schlechter (4 statt 5 Posten), ein anderer
   Durchlauf gewann, angezeigt wurde dessen Bild mit Hand und Wellen. Jetzt: Ausgabegröße aus der Länge der
   Gitterlinien, abgetastet aus dem Foto in voller Auflösung, auf 1300 px Lesebreite gebracht → UVDoc-Durchlauf liest
   alle 5 Posten und gewinnt; angezeigt wird der entfaltete Bon.
2. **„AEUTERQUARK“:** Die Namensbereinigung entfernte Währungskürzel auch mitten im Wort („KR“aeuterquark,
   F„EUR“zeug). Jetzt nur als eigenes Wort.

## Summe ohne Summenwort und falsch „geprüfte“ Bons (SROIE)
- Stückzahl-Summen („Total Qty 2“, „Item(s): 5“) sind nie die Gesamtsumme.
- „Total incl. GST“, „Net Total“ sind die Gesamtsumme, keine Steuerzeile.
- „Total“-Zeilen in einer Steuer-Übersicht nach der Summe sind Steuersummen.
- Kopfzeilen mit drei Spaltenwörtern („QTY PRICE DISC AMT“) sind nie Posten, auch mit Zahl.
- Rundung auf 5/10 Cent: nur mit Rundungszeile; gerundeter Betrag muss später auf dem Bon stehen; Rundung wird ein
  eigener Posten.
- Gefundene Summe + Steuer/Service/Rundung danach = spätere Summe (auch kleiner, „Total Rounded“).
- **Ohne Summenwort** (weltweit): Beträge nach dem Postenblock, mindestens so groß wie jeder Posten, sind Kandidaten;
  zweimal vorkommend (Summe + Zahlung) günstiger. „Geprüft“ gibt es weiter nur, wenn die Posten genau aufgehen.
