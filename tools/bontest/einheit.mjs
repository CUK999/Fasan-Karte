import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', (e) => console.log('FEHLER', String(e)));
await p.goto('http://localhost:8765/manifest.webmanifest');
await p.addScriptTag({ url: 'http://localhost:8765/bon.js' });
const r = await p.evaluate(() => {
  // Zeile aus Text; unsicher: { stelle: [p, alt, p2] }
  const Z = (t, y, unsicher = {}) => ({ text: t, b: { x0: 0, y0: y, x1: 500, y1: y + 20 }, c: 95, zeichen: [...t].map((z, i) => unsicher[i] ? { z, p: unsicher[i][0], alt: unsicher[i][1], p2: unsicher[i][2] } : { z, p: 0.999 }) });
  const fall = (name, zeilen, qr) => { const x = window.Bon.liesAllgemein(zeilen, qr); return [name, x.posten.map((q) => `${q.t}=${q.b}${q.rep ? '(' + q.rep + ')' : ''}${q.sicher ? '' : '?'}`).join(' | '), 'total', x.total, 'ok', x.pruefung.gesamtOk, x.pruefung.quelle]; };
  const out = [];
  // 1. Ziffer falsch gelesen (18,50 → 13,50), Summe stimmt → Korrektur über zweitbeste Ziffer
  out.push(fall('ziffer', [Z('2 x Weizenbier 9,80', 0), Z('Schnitzel 13,50', 20, { 11: [0.6, '8', 0.35] }), Z('Salat 6,50', 40), Z('Summe EUR 34,80', 60)]));
  // 2. Summenzeile falsch gelesen (34,30), Kartenzahlung richtig → Ziel aus der Zahlung
  out.push(fall('summe falsch', [Z('Weizenbier 9,80', 0), Z('Schnitzel 18,50', 20), Z('Salat 6,50', 40), Z('Summe 34,30', 60), Z('Karte 34,80', 80)]));
  // 3. USA: Steuer kommt obendrauf
  out.push(fall('usa', [Z('Burger 13.95', 0), Z('Fries 4.50', 20), Z('Subtotal 18.45', 40), Z('Tax 1.29', 60), Z('Total 19.74', 80)]));
  // 4. keine Summe lesbar → unsicher, keine erfundene Summe
  out.push(fall('ohne summe', [Z('Burger 13,95', 0), Z('Fries 4,50', 20)]));
  // 5. Menge × Preis rettet falsch gelesenen Zeilenbetrag (5,80 statt 9,80, ohne Alternative)
  out.push(fall('menge', [Z('Weizenbier', 0), Z('2 x 4,90 5,80', 20), Z('Salat 6,50', 40), Z('Summe 16,30', 60)]));
  // 6. Rabatt und Pfand
  out.push(fall('rabatt', [Z('Kaese 1,78', 0), Z('Rabatt Kaese 0,30', 20), Z('Pfand 0,25', 40), Z('SUMME 1,73', 60)]));
  // 7. Nichts passt → nichts schönrechnen
  out.push(fall('passt nicht', [Z('A Essen 10,00', 0), Z('B Essen 20,00', 20), Z('Total 99,00', 40)]));
  // 8. Tausender und Punkt-Dezimal (Schweiz)
  out.push(fall('schweiz', [Z("Uhr 1'234.50", 0), Z('Band 15.50', 20), Z("Total CHF 1'250.00", 40)]));
  return out;
});
for (const x of r) console.log(x.join('  '));
await b.close();
