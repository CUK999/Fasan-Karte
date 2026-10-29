'use strict';
/* Fasan Karte – Kassenzettel lesen, ganz im Handy. MPL-2.0
 * Texterkennung: PaddleOCR über ocr.js (seit 3.7, 29.10.2026), sonst tesseract.js 5.1.1 (Apache-2.0) mit portugiesischen
 * Sprachdaten (4.0.0_best_int), vendor/tesseract/. Lesen der Zeilen: liesAllgemein (alle Länder), liesPT (QR-Steuerklassen).
 * Vorgehen (getestet 24.10.2026 an zwei nachgebauten Bons, siehe docs/recherche/2026-10-24-kassenzettel.md):
 *  - PSM 11 (verstreuter Text) findet Namen und Preise auch über breite Lücken; PSM 4/6 verloren rechte Preisspalten.
 *  - Zeilen bauen wir selbst aus den Wort-Rahmen (gleiche Höhe = gleiche Zeile), das verträgt leicht schräge Fotos.
 *  - Jede Zeile behält ihren Rahmen im Foto: Die App zeigt sie dort an, man korrigiert direkt im Bild.
 * Das Foto verlässt das Gerät nie.
 */
window.Bon = (() => {
  let worker = null, laedt = null;
  const basis = () => new URL('vendor/tesseract/', location.href).href;

  function ladeSkript(src) {
    return new Promise((ok, fehler) => {
      if (window.Tesseract) { ok(); return; }
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fehler(new Error('Texterkennung konnte nicht geladen werden'));
      document.head.append(s);
    });
  }
  async function bereit(melde) {
    if (worker) return worker;
    if (!laedt) {
      laedt = (async () => {
        await ladeSkript(basis() + 'tesseract.min.js');
        const w = await window.Tesseract.createWorker('por', 1, {
          workerPath: basis() + 'worker.min.js', corePath: basis() + 'core', langPath: basis() + 'lang', gzip: true,
          logger: (m) => melde && melde(m),
        });
        // user_defined_dpi: ohne Angabe fällt Tesseract auf 70 dpi zurück (Recherche kassenzettel.md)
        await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1', user_defined_dpi: '300' });
        worker = w; return w;
      })().catch((e) => { laedt = null; throw e; });
    }
    return laedt;
  }

  // Bild vorbereiten (Tesseract „ImproveQuality“: Kontrast, Binarisierung, Schräglage):
  // 1. Graustufen, längste Seite 2200 px. 2. Licht ausgleichen: Pixel / örtlicher Mittelwert (Kasten-Unschärfe über
  // Integralbild), gegen Schatten und Verläufe. 3. Kontrast strecken (1.–99. Perzentil). 4. Schräglage per Projektionsprofil
  // (−10° bis +10°, Schritt 0,5°) messen und gerade drehen. Ergebnis: Leinwand für die Erkennung und als Anzeige-Bild.
  function grau(c) {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data, n = c.width * c.height, y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
    return { y, d, g };
  }
  function lichtAusgleich(y, w, h) {
    const r = Math.max(8, Math.round(Math.min(w, h) / 30));
    const I = new Float64Array((w + 1) * (h + 1));
    for (let j = 0; j < h; j++) { let zs = 0; for (let i = 0; i < w; i++) { zs += y[j * w + i]; I[(j + 1) * (w + 1) + i + 1] = I[j * (w + 1) + i + 1] + zs; } }
    const out = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      const a = Math.max(0, j - r), b = Math.min(h, j + r + 1);
      for (let i = 0; i < w; i++) {
        const l = Math.max(0, i - r), q = Math.min(w, i + r + 1);
        const m = (I[b * (w + 1) + q] - I[a * (w + 1) + q] - I[b * (w + 1) + l] + I[a * (w + 1) + l]) / ((b - a) * (q - l));
        out[j * w + i] = Math.min(255, (255 * y[j * w + i]) / Math.max(1, m * 1.02));
      }
    }
    return out;
  }
  function schraeglage(y, w, h, grenze = 10) {
    const f = Math.min(1, 700 / Math.max(w, h)), pts = [];
    for (let j = 0; j < h; j += Math.max(1, Math.round(1 / f))) for (let i = 0; i < w; i += Math.max(1, Math.round(1 / f))) if (y[j * w + i] < 110) pts.push(i * f, j * f);
    if (pts.length < 200) return 0;
    let besterW = 0, besteV = -1;
    for (let gr = -grenze; gr <= grenze; gr += 0.5) {
      const t = (gr * Math.PI) / 180, sin = Math.sin(t), cos = Math.cos(t), bins = new Map();
      for (let k = 0; k < pts.length; k += 2) { const r = Math.round(pts[k + 1] * cos - pts[k] * sin); bins.set(r, (bins.get(r) || 0) + 1); }
      let s = 0, s2 = 0; for (const v of bins.values()) { s += v; s2 += v * v; }
      const v = s2 / bins.size - (s / bins.size) ** 2;
      if (v > besteV) { besteV = v; besterW = gr; }
    }
    return besterW;
  }
  function vorbereiten(daten, gerade) {
    return new Promise((ok, fehler) => {
      const img = typeof daten === 'string' ? new Image() : daten;
      img.onload = () => {
        const f = gerade ? 1 : Math.min(2.5, 2200 / Math.max(img.width, img.height));
        let c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const { y, d, g } = grau(c);
        const flach = lichtAusgleich(y, c.width, c.height);
        const hist = new Uint32Array(256); for (const v of flach) hist[Math.round(v)] += 1;
        const n = flach.length; let lo = 0, hi = 255, s = 0;
        for (let v = 0; v < 256; v++) { s += hist[v]; if (s > n * 0.01) { lo = v; break; } }
        s = 0; for (let v = 255; v >= 0; v--) { s += hist[v]; if (s > n * 0.01) { hi = v; break; } }
        const sp = Math.max(1, hi - lo), p = d.data;
        for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, Math.round(((flach[i] - lo) * 255) / sp))); p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v; p[i * 4 + 3] = 255; flach[i] = v; }
        g.putImageData(d, 0, 0);
        const winkel = schraeglage(flach, c.width, c.height, gerade ? 3 : 10);
        if (Math.abs(winkel) >= 0.5) {
          const t = (-winkel * Math.PI) / 180, cos = Math.abs(Math.cos(t)), sin = Math.abs(Math.sin(t));
          const r = document.createElement('canvas'); r.width = Math.round(c.width * cos + c.height * sin); r.height = Math.round(c.width * sin + c.height * cos);
          const rg = r.getContext('2d'); rg.fillStyle = '#fff'; rg.fillRect(0, 0, r.width, r.height);
          rg.translate(r.width / 2, r.height / 2); rg.rotate(t); rg.drawImage(c, -c.width / 2, -c.height / 2);
          c = r;
        }
        ok({ canvas: c, winkel });
      };
      img.onerror = () => fehler(new Error('Foto nicht lesbar'));
      if (typeof daten === 'string') img.src = daten; else img.onload();
    });
  }

  // Wörter zu Zeilen: gleiche Mittelhöhe (± 0,55 × Wort-Höhe), bezogen auf das nächste Wort links (verträgt Schräglage)
  function zeilenAus(woerter) {
    // Höhe ohne den Anteil, den die Schräglage zum Rahmen beiträgt (sonst würden Nachbarzeilen mitgefangen)
    const w = woerter.filter((x) => x.t.trim() && x.c > 15).map((x) => ({ ...x, cy: (x.b.y0 + x.b.y1) / 2, h: Math.max(4, x.b.y1 - x.b.y0 - (x.neig ? Math.abs(x.neig) * (x.b.x1 - x.b.x0) : 0)) }));
    w.sort((a, b) => a.b.x0 - b.b.x0);
    // Neigung am Ort: Median der Neigungen langer Kästen in der Nähe (kurze Wörter haben keine verlässliche Richtung);
    // bei Perspektive ändert sich die Neigung über die Höhe des Bons, darum örtlich statt einer für alle.
    const lang = w.filter((x) => x.neig != null && x.b.x1 - x.b.x0 > 6 * x.h);
    const med = (v) => { v.sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 0; };
    const alle = med(lang.map((q) => q.neig));
    const neigBei = (y, h) => { const v = lang.filter((q) => Math.abs(q.cy - y) < 5 * h).map((q) => q.neig); return v.length ? med(v) : alle; };
    const zeilen = [];
    for (const x of w) {
      let beste = null, bestD = Infinity;
      for (const z of zeilen) {
        const letztes = z.w[z.w.length - 1];
        if (letztes.b.x1 > x.b.x0 + x.h) continue; // überlappt waagrecht: andere Zeile
        // Schräge Zeilen (PaddleOCR liefert die Neigung): Höhe des linken Wortes bis zur Mitte des neuen Wortes verlängern
        const n = neigBei(letztes.cy, letztes.h), dx = (x.b.x0 + x.b.x1) / 2 - (letztes.b.x0 + letztes.b.x1) / 2;
        const d = Math.abs(letztes.cy + n * dx - x.cy);
        if (d < 0.55 * Math.max(x.h, letztes.h) && d < bestD) { beste = z; bestD = d; }
      }
      if (beste) beste.w.push(x); else zeilen.push({ w: [x] });
    }
    for (const z of zeilen) {
      z.b = { x0: Math.min(...z.w.map((x) => x.b.x0)), y0: Math.min(...z.w.map((x) => x.b.y0)), x1: Math.max(...z.w.map((x) => x.b.x1)), y1: Math.max(...z.w.map((x) => x.b.y1)) };
      z.c = Math.min(...z.w.map((x) => x.c));
      // Zeichen mit Sicherheit und zweitbester Lesung (PaddleOCR); Text und Zeichenliste bleiben Stelle für Stelle gleich lang
      const zz = [];
      for (const x of z.w) {
        if (zz.length) zz.push({ z: ' ', p: 1 });
        const eigene = x.zeichen && x.zeichen.length ? x.zeichen.filter((q) => q.z) : [...x.t].map((ch) => ({ z: ch, p: (x.c || 0) / 100 }));
        let s = 0, e = eigene.length; while (s < e && eigene[s].z === ' ') s++; while (e > s && eigene[e - 1].z === ' ') e--;
        for (let k = s; k < e; k++) zz.push(eigene[k]);
      }
      z.zeichen = zz;
      z.text = zz.map((q) => q.z).join('');
    }
    return zeilen.sort((a, b) => (a.b.y0 + a.b.y1) - (b.b.y0 + b.b.y1));
  }

  // Preise: 1,50 / 12,90 / 1.234,50 / -0,20; Buchstaben-Verwechsler zwischen Ziffern werden korrigiert
  const PREIS = /(-?\d{1,3}(?:[.\s]\d{3})*[,.]\d{2})(?!\d)/g;
  const NEIN = /\b(sub-?total|total|iva|taxa|base|multibanco|mb\s*way|visa|mastercard|maestro|cart[aã]o|troco|dinheiro|numer[aá]rio|pago|nif|contribuinte|atcud|fatura|factura|documento|original|data|hora|mesa|operador|obrigad|volte|saldo|acumulad|pontos|tel\.?|telefone|www\.|lda|s\.a\.|loja)\b/i;
  const TOTAL = /\btotal\b(?!\s*iva)/i;
  function zahl(t) {
    // ohne Lookbehind (ältere Safari-Fassungen kennen ihn nicht)
    const x = t.replace(/(\d)[oO](?=\d)/g, (m, d) => `${d}0`).replace(/(\d)[lI|](?=\d)/g, (m, d) => `${d}1`);
    return x;
  }
  function cent(s) { const neg = s.startsWith('-'); const v = Math.round(parseFloat(s.replace(/[-\s.](?=\d{3}\b)/g, '').replace(/^-/, '').replace(',', '.')) * 100); return neg ? -v : v; }
  const buchstaben = (t) => (t.replace(/\b(x|kg|eur|un|uni|l|cl|ml|g)\b/gi, '').match(/[a-zà-ÿ]/gi) || []).length;

  // ---------- Bons aus allen Ländern (lateinische Schrift) ----------
  // 1. Zahlenformat am Bon selbst erkennen: Komma oder Punkt als Dezimaltrenner (1.234,50 / 1,234.50 / 1'234.50).
  // 2. Zeilen einordnen: Posten, Summe, Zwischensumme, Steuer, Service, Zahlung, Rabatt, Sonstiges (Wörter in vielen Sprachen).
  // 3. Schiedsrichter: Die Posten müssen eine unabhängig gelesene Summe ergeben (Summenzeile, Kartenzahlung, gegeben − Rückgeld,
  //    QR-Code). Unsichere Ziffern haben eine zweitbeste Lesung (PaddleOCR), Menge × Einzelpreis ist eine weitere Lesung.
  //    Gewählt wird die Kombination mit den wenigsten Änderungen, die genau aufgeht. Geht nichts auf, bleibt die Lesung
  //    sichtbar unsicher und die App zeigt die Differenz – nichts wird schöngerechnet.
  const ohneAkz = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const W = {
    summe: /\b(total|totaal|totale|totalt|gesamt|gesamtbetrag|gesamtsumme|summe|endsumme|endbetrag|zu zahlen|zahlbetrag|importe|a pagar|montant|net a payer|te betalen|suma|razem|celkem|osszesen|yhteensa|att betala|i alt|ukupno|toplam|kokku|amount due|balance due)\b/,
    zwischen: /\b(sub-?total|subtotale|subtotaal|sous-?total|zwischensumme|zw\.? ?summe)\b/,
    steuer: /\b(mwst|mw\.?st|ust|vat|tax|taxes|sales tax|iva|tva|btw|moms|mva|alv|dph|pdv|kdv|steuer|netto|brutto|incidencia|imponibile|imposta|taxa|base)\b/,
    service: /\b(service|bedienung|trinkgeld|tip|tips|gratuity|servizio|pourboire|fooi|propina)\b/,
    zahlung: /\b(bar|gegeben|kartenzahlung|karte|ec|ec-cash|girocard|kreditkarte|visa|mastercard|maestro|amex|vpay|paypal|apple pay|google pay|cash|card|tendered|efectivo|tarjeta|especes|carte|cb|contanti|carta|bancomat|pin|contant|kaart|pinnen|multibanco|mb way|dinheiro|numerario|cartao|kontaktlos|contactless|bezahlt|paid)\b/,
    rueck: /\b(ruckgeld|wechselgeld|change|cambio|vuelto|rendu|resto|troco|wisselgeld)\b/,
    rabatt: /\b(rabatt|nachlass|coupon|gutschein|discount|desconto|descuento|sconto|remise|reduction|korting|leergut|pfandruckgabe)\b/,
    nein: /\b(capital|social|registo|registro|contrib|contribuinte|conservatoria|matricula|e-?mail|iban|bic|swift|handelsregister|hrb|amtsgericht|geschaftsfuhrer|sede|datum|date|data|fecha|uhrzeit|hora|heure|ora|tisch|table|mesa|tavolo|kasse|kassierer|beleg|bon-?nr|receipt|recibo|ricevuta|tel|telefon|phone|fax|www|http|ust-?id|st\.?-?nr|steuer-?nr|steuernummer|nif|nipc|siret|cif|atcud|fatura|factura|rechnung|invoice|original|kopie|copy|operador|bediener|kellner|cashier|danke|thank|thanks|merci|grazie|gracias|obrigad[oa]|vielen|willkommen|welcome|gmbh|lda|srl|ltd|inc|ohg|tse|signatur|seriennummer|transaktion|terminal|trace|beleg-?nr|autorisierung|kartennummer)\b/,
    // Spaltenüberschrift über den Posten („Qt Descrição P.Unit. Tx Valor“, „Menge Artikel Preis Betrag“)
    kopf: /\b(qt|qtd|qty|qte|quant|quantidade|menge|anz|anzahl|descri[cç]?[aã]?o|descricao|descripcion|description|bezeichnung|artikel|artigo|article|articulo|produkt|produto|p\.?\s?unit|p\.?\s?u|preco|preis|price|prix|precio|prezzo|valor|betrag|amount|montant|importe|importo|tx|vat|mwst|einzel)\b/g,
    // Einzelpreis-Zeilen unter dem Posten („Preco: 12,90/Uni“, „à 2,50“, „je 1,99“, „@ 3.50“)
    einzel: /\b(pre[cç]o|preis|price|prix|precio|prezzo|prijs|je|a|à|@|ea|each|stuckpreis|einzelpreis|ep)\b\s*[:;.]?\s*$/,
  };
  // Einheiten/Mengen, die keine Namen sind
  const MENGE_VORN = /^\s*(\d{1,3}(?:[.,]\d{1,3})?)\s*(?:x|×|\*|stk\.?|st\.?|pcs\.?|pc\.?|un\.?|uni|und\.?|pz\.?|kg|l)?\s*[x×*]?\s+/i;
  function dezimal(zeilen) {
    let k = 0, p = 0;
    for (const z of zeilen) { k += (z.text.match(/\d,\d{2}(?!\d)/g) || []).length; p += (z.text.match(/\d\.\d{2}(?!\d)/g) || []).length; }
    return p > k ? '.' : ',';
  }
  // Beträge einer Zeile mit Stelle im Text; „1,00-“ und „-1,00“ sind negativ; „19,00 %“ ist ein Steuersatz, kein Betrag
  // Der Dezimaltrenner ist immer der letzte Trenner vor genau zwei Ziffern; die Erkennung liest ein Komma auch mal als Punkt
  // („34.90“ auf einem Bon mit Kommas). Tausender-Gruppen nur mit dem jeweils anderen Zeichen (oder ' bzw. Leerzeichen).
  function betraege(t, dez) {
    const re = /(^|[^\d.,])(-\s?)?((?:\d{1,3}(?:[.,' ]\d{3})+|\d+)[.,]\d{2})(?!\d|[.,]\d)(\s?-(?![\d]))?/g;
    const out = []; let m;
    while ((m = re.exec(t))) {
      const start = m.index + m[1].length + (m[2] ? m[2].length : 0), ende = start + m[3].length;
      if (/^\s*%/.test(t.slice(ende))) continue;
      const roh = m[3], d = roh.length - 3, ganz = roh.slice(0, d).replace(/[.,' ]/g, '');
      if (/[.,]/.test(roh.slice(0, d)) && roh.slice(0, d).replace(/\d/g, '').split('').some((c) => c === roh[d])) continue; // 1.234.56: unklar
      const v = Math.round(parseFloat(`${ganz}.${roh.slice(d + 1)}`) * 100);
      out.push({ v: m[2] || m[4] ? -v : v, start, ende, neg: !!(m[2] || m[4]) });
    }
    return out;
  }
  // Andere Lesungen eines Betrags aus den zweitbesten Ziffern (nur unsichere Ziffern, höchstens eine Änderung je Lesung)
  function alternativen(z, b, dez) {
    const out = [];
    if (!z.zeichen) return out;
    for (let i = b.start; i < b.ende; i++) {
      const q = z.zeichen[i]; if (!q || !/\d/.test(q.z) || q.p > 0.97 || !q.alt || !/\d/.test(q.alt) || q.p2 < 0.01) continue;
      const t = z.text.slice(b.start, i) + q.alt + z.text.slice(i + 1, b.ende);
      const v = Math.round(parseFloat(`${t.slice(0, t.length - 3).replace(/[.,' ]/g, '')}.${t.slice(-2)}`) * 100);
      if (Number.isFinite(v)) out.push({ v: b.neg ? -v : v, k: 1 + Math.max(0, Math.log10(q.p / Math.max(q.p2, 1e-4))) / 2, warum: 'Ziffer unsicher' });
    }
    return out;
  }
  const buchst = (t) => (ohneAkz(t).replace(/\b(x|kg|eur|euro|usd|chf|gbp|un|uni|stk|st|pcs|l|cl|ml|g)\b/g, '').match(/[a-z]/g) || []).length;
  function nameAus(t) {
    return t.replace(MENGE_VORN, '').replace(/\b\d{1,2}\s*%/g, '').replace(/(€|eur|euro|usd|chf|gbp|\$|£|fr\.|kr|zł|kč)/gi, '')
      .replace(/\s+\d+[.,]\d[a-z]?\s*$/i, '').replace(/\s+[A-Z0-9*]{1,2}\s*$/, '').replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ.)]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function liesAllgemein(zeilen, qr) {
    const dez = dezimal(zeilen);
    const info = zeilen.map((z, i) => {
      const n = ohneAkz(z.text), bt = betraege(z.text, dez);
      let mengeVorn = null;
      if (bt.length >= 2 && /^\W*$/.test(z.text.slice(0, bt[0].start)) && /^\s*[A-Za-zÀ-ÿ]/.test(z.text.slice(bt[0].ende)) && bt[0].v > 0 && bt[0].v <= 9900) { mengeVorn = bt[0].v / 100; bt.shift(); }
      const letzter = bt.length ? bt[bt.length - 1] : null;
      let art = 'sonst';
      if (!bt.length && (n.match(W.kopf) || []).length >= 2) art = 'kopf';
      else if (W.zwischen.test(n)) art = 'zwischen';
      else if (W.summe.test(n) && !W.steuer.test(n.replace(W.summe, ''))) art = 'summe';
      else if (W.rueck.test(n)) art = 'rueck';
      else if (W.zahlung.test(n) && !/\d\s*[x×*]\s*\d/.test(n)) art = 'zahlung';
      else if (W.service.test(n)) art = 'service';
      else if (W.steuer.test(n) || /^\W*\d{1,2}([.,]\d+)?\s*%/.test(n)) art = 'steuer';
      else if (W.rabatt.test(n)) art = 'rabatt';
      else if (W.nein.test(n)) art = 'nein';
      // Menge × Einzelpreis in der Zeile: „2 x 4,90“, „3 X 0,79 2,37“, „0,512 kg x 2,99 €/kg“
      let menge = null, einzel = null;
      const mx = new RegExp(`(\\d{1,3}(?:[.,]\\d{1,3})?)\\s*(?:stk\\.?|st\\.?|kg|pcs|un\\.?|uni)?\\s*[x×*]\\s*(\\d+\\${dez}\\d{2})`, 'i').exec(z.text);
      if (mx) { menge = parseFloat(mx[1].replace(',', '.')); einzel = Math.round(parseFloat(mx[2].replace(dez, '.')) * 100); }
      else if (mengeVorn) { menge = mengeVorn; if (bt.length >= 2) einzel = bt[bt.length - 2].v; }
      else { const mv = /^\s*(\d{1,2})\s*(?:x|×|stk\.?|st\.?|pcs\.?|un\.?|uni|und\.?|pz\.?)?\s+[A-Za-zÀ-ÿ]/i.exec(z.text); if (mv && +mv[1] > 0) menge = +mv[1]; }
      const name = letzter ? nameAus(z.text.slice(0, (mx ? Math.min(mx.index, bt[0].start) : bt[0].start))) : nameAus(z.text);
      return { i, z, n, bt, letzter, art, menge, einzel, name, bu: buchst(name), nurEinzel: W.einzel.test(ohneAkz(z.text.slice(0, bt.length ? bt[0].start : z.text.length))) };
    });
    // Ende des Postenteils: erste Summenzeile mit Betrag (danach kommen Zahlung, Steuer, Fußtext)
    // (steht der Betrag der Summenzeile durch Schräglage eine Zeile tiefer, gilt die Zeile ohne Betrag als Ende)
    let ende = info.findIndex((r, i) => r.art === 'summe' && (r.letzter || (info[i + 1] && info[i + 1].letzter && info[i + 1].bu < 3)));
    if (ende < 0) ende = info.length;
    const kopfZ = info.findIndex((r, i) => i < ende && r.art === 'kopf');
    const posten = [], zuschlaege = [];
    for (let i = kopfZ + 1; i < ende; i++) {
      const r = info[i];
      if (!r.letzter || r.art === 'nein' || r.art === 'zwischen') continue;
      if (r.art === 'steuer' || r.art === 'service') { zuschlaege.push({ t: r.art === 'service' ? (r.name || 'Service') : (r.name || 'Steuer'), art: r.art, zeile: i, kand: [{ v: r.letzter.v, k: 0 }, ...alternativen(r.z, r.letzter, dez)] }); continue; }
      // Einzelpreis- oder Mengenzeile ohne Namen direkt unter einem Posten: gehört zum Posten darüber
      const vorher = posten[posten.length - 1];
      if (vorher && vorher.zeile === i - 1 && (r.nurEinzel || (r.bu < 2 && r.einzel && r.bt.length === 1))) {
        const e = r.nurEinzel ? r.letzter.v : r.einzel; vorher.einzel = e;
        if (r.einzel && r.menge) vorher.menge = r.menge;
        const m = vorher.menge || (e ? Math.round(vorher.b / e) : 0);
        if (e && m && m * e !== vorher.b && m <= 50) vorher.kand.push({ v: Math.round(m * e), k: 0.6, warum: 'Menge × Preis' });
        r.typ = 'teil'; r.zu = posten.length - 1; continue;
      }
      let name = r.name, nameZeile = -1;
      // Name eine Zeile höher (Posten über zwei Zeilen: Name, darunter „2 x 4,90   9,80“)
      if (r.bu < 2) for (let k = i - 1; k >= Math.max(0, i - 2); k--) { const o = info[k]; if (o.letzter || o.art !== 'sonst' || o.typ) break; if (o.bu >= 2) { name = o.name; nameZeile = k; break; } }
      let v = r.letzter.v;
      if (r.art === 'rabatt' && v > 0) v = -v;
      const kand = [{ v, k: 0 }, ...alternativen(r.z, r.letzter, dez).map((a) => ({ ...a, v: r.art === 'rabatt' && a.v > 0 ? -a.v : a.v }))];
      if (r.einzel && r.menge) { const mv = Math.round(r.menge * r.einzel); if (mv !== v && Math.abs(mv) < 1e6) kand.push({ v: mv, k: 0.6, warum: 'Menge × Preis' }); }
      if (nameZeile >= 0) { info[nameZeile].typ = 'teil'; info[nameZeile].zu = posten.length; }
      r.typ = 'posten'; r.zu = posten.length;
      const lesbar = buchst(name) >= 2;
      // Jede Zeile darf beim Abgleich wegfallen: ohne Namen billig, mit Namen teuer (die Summe muss dann trotzdem genau stimmen)
      kand.push({ v: 0, k: lesbar ? 1.6 : 1.2, warum: 'weg' });
      posten.push({ t: lesbar ? name : (v < 0 ? 'Rabatt' : 'Posten'), b: v, menge: r.menge && r.menge >= 1 && Number.isInteger(r.menge) ? r.menge : 1, einzel: r.einzel, zeile: i, c: r.z.c, rahmen: r.z.b, nameZeile, nameUnsicher: !lesbar, kand });
    }
    // Summen-Kandidaten: Summenzeile(n), Kartenzahlung, gegeben − Rückgeld, QR-Code
    const ziele = [];
    const ziel = (v, k, quelle) => { if (v > 0 && !ziele.some((z) => z.v === v && z.k <= k)) ziele.push({ v, k, quelle }); };
    if (qr && qr.total) ziel(qr.total, 0, 'qr');
    let totalZeile = -1, totalGelesen = null;
    for (let i = ende; i < info.length; i++) {
      const r = info[i];
      // Summenzeile ohne Betrag: Betrag der nächsten Zeile ist ein Kandidat (etwas teurer)
      if (r.art === 'summe' && !r.letzter && info[i + 1] && info[i + 1].letzter) { const q = info[i + 1]; ziel(q.letzter.v, 0.3, 'summe'); if (totalZeile < 0) { totalZeile = i; totalGelesen = q.letzter.v; } r.typ = 'summe'; continue; }
      if (!r.letzter) continue;
      if (r.art === 'summe') { if (totalZeile < 0) { totalZeile = i; totalGelesen = r.letzter.v; } ziel(r.letzter.v, 0, 'summe'); for (const a of alternativen(r.z, r.letzter, dez)) ziel(a.v, a.k, 'summe'); r.typ = 'summe'; }
    }
    const gegeben = info.filter((r, i) => i >= ende && r.art === 'zahlung' && r.letzter).map((r) => r.letzter.v);
    const rueck = info.filter((r, i) => i >= ende && r.art === 'rueck' && r.letzter).map((r) => Math.abs(r.letzter.v));
    for (const g of gegeben) { ziel(g, 0.4, 'zahlung'); for (const q of rueck) if (g - q > 0) ziel(g - q, 0.4, 'zahlung'); }
    // Beträge größer als jede gelesene Summe können keine Posten sein (z. B. Stammkapital im Kopf): Streichen fast kostenlos
    const maxZiel = ziele.length ? Math.max(...ziele.map((z) => z.v)) : Infinity;
    for (const p of posten) if (Math.abs(p.b) > maxZiel) { const w = p.kand.find((c) => c.warum === 'weg'); if (w) w.k = 0.1; }
    const loesung = posten.length ? abgleich(posten, zuschlaege, ziele) : null;
    let total = null, gesamtOk = false;
    if (loesung) {
      posten.forEach((p, i) => { const c = p.kand[loesung.wahl[i]]; if (c.warum === 'weg') { p.weg = true; return; } if (c.v !== p.b) p.rep = c.warum || 'aus der Summe'; p.b = c.v; p.sicher = true; });
      for (let i = posten.length - 1; i >= 0; i--) if (posten[i].weg) { const z = info[posten[i].zeile]; z.typ = 'sonst'; posten.splice(i, 1); }
      posten.forEach((p, i) => { info[p.zeile].zu = i; if (p.nameZeile >= 0) info[p.nameZeile].zu = i; });
      loesung.zus.forEach((w, i) => { if (w >= 0) { const z = zuschlaege[i]; posten.push({ t: z.t, b: z.kand[w].v, menge: 1, zeile: z.zeile, c: 100, zuschlag: z.art, sicher: true, kand: [] }); info[z.zeile].typ = 'zuschlag'; } });
      total = loesung.ziel.v; gesamtOk = true;
    } else {
      // Beste Summe ohne Abgleich: QR vor Summenzeile vor Zahlung; Posten bleiben unsicher
      total = qr && qr.total ? qr.total : totalGelesen != null ? totalGelesen : gegeben.length ? gegeben[0] - (rueck[0] || 0) : null;
      for (const p of posten) p.sicher = false;
    }
    // „3 x Espresso 7,50“ ohne gedruckten Einzelpreis: geht der Betrag glatt auf, je Stück teilbar machen
    for (const p of posten) if (!p.zuschlag && p.menge > 1 && !p.einzel && p.b > 0 && p.b % p.menge === 0) p.einzel = p.b / p.menge;
    const summe = posten.reduce((a, p) => a + p.b, 0);
    return { zeilen: info.map((r) => ({ text: r.z.text, b: r.z.b, c: r.z.c, typ: r.typ || (r.art === 'sonst' ? 'sonst' : r.art), zu: r.zu })), posten, total, totalZeile, summe, dez,
      pruefung: { gesamtOk: gesamtOk && summe === total, quelle: loesung ? loesung.ziel.quelle : null, korrigiert: posten.filter((p) => p.rep).length, ziele: ziele.length } };
  }
  // Kleinste Zahl an Änderungen, mit der die Posten (plus wahlweise Steuer/Service vor der Summe) eine der Summen ergeben.
  // Dynamische Programmierung über Cent-Summen; höchstens 3 Änderungen, sonst gilt der Bon als nicht abgeglichen.
  function abgleich(posten, zus, ziele) {
    if (!ziele.length) return null;
    const MAXK = 3, schichten = [];
    let dp = new Map([[0, { k: 0 }]]);
    const schritt = (optionen) => {
      const neu = new Map();
      for (const [s, e] of dp) for (const o of optionen) {
        const ns = s + o.v, nk = e.k + o.k; if (nk > MAXK) continue;
        const alt = neu.get(ns); if (!alt || nk < alt.k) neu.set(ns, { k: nk, vor: s, w: o.w });
      }
      // Speicher begrenzen: nur die günstigsten Summen behalten
      if (neu.size > 40000) { const sort = [...neu].sort((a, b) => a[1].k - b[1].k).slice(0, 40000); dp = new Map(sort); } else dp = neu;
      schichten.push(dp);
    };
    posten.forEach((p) => schritt(p.kand.map((c, w) => ({ v: c.v, k: c.k, w }))));
    // Steuer/Service: mitzählen (z. B. USA: Steuer kommt obendrauf) oder nicht (Europa: Steuer ist im Preis enthalten)
    zus.forEach((z) => schritt([{ v: 0, k: 0, w: -1 }, ...z.kand.map((c, w) => ({ v: c.v, k: c.k + 0.05, w }))]));
    let beste = null;
    for (const z of ziele) { const e = dp.get(z.v); if (e && (!beste || e.k + z.k < beste.k)) beste = { k: e.k + z.k, ziel: z }; }
    if (!beste) return null;
    // Rückwärts die Wahl je Zeile ablesen
    const wahl = [], zw = []; let s = beste.ziel.v;
    for (let i = schichten.length - 1; i >= 0; i--) { const e = schichten[i].get(s); if (i >= posten.length) zw.unshift(e.w); else wahl.unshift(e.w); s = e.vor; }
    return { wahl, zus: zw, ziel: beste.ziel, k: beste.k };
  }
  function lies(zeilen, qr) {
    const a = liesAllgemein(zeilen, qr);
    if (a.pruefung.gesamtOk) return a;
    // Portugiesische Bons mit Steuerklassen im QR-Code: eigener, an echten Bons geprüfter Weg (Version 3.6)
    let pt = null; try { pt = liesPT(zeilen, qr); } catch (e) { pt = null; }
    if (pt && pt.pruefung && pt.pruefung.gesamtOk) return pt;
    return a.posten.length >= (pt ? pt.posten.length : 0) ? a : pt;
  }

  // ---------- Portugiesischer Bon (Zone Soft u. a.): „2 Uni PIZZA PEPPERONI 13% 25,80“, darunter „Preco: 12,90/Uni“.
  // Prüfen: Summe der Zeilen je Steuersatz gegen die Brutto-Beträge im QR-Code (oder die TAXA-Tabelle des Bons), Gesamtsumme gegen QR.
  const SAETZE = [0, 4, 5, 6, 8, 9, 12, 13, 16, 22, 23];
  // Das Prozentzeichen und die Ziffern davor werden oft falsch gelesen („193%“, „93%“, „3%“). Kandidaten: genauer Satz, sonst
  // alle Sätze der Steuerklassen des Bons (QR) bzw. 6/13/23, die höchstens einen Buchstaben/Ziffer abweichen.
  function abstand(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
  function satzKand(ziffern, moegliche) {
    if (SAETZE.includes(+ziffern) && ziffern.length <= 2) return [+ziffern];
    return moegliche.filter((x) => abstand(String(x), ziffern) <= 1);
  }
  function liesPT(zeilen, qr) {
    const posten = [];
    let tabelle = [];
    const moegl = qr && qr.klassen && qr.klassen.filter((k) => k.brutto > 0).length ? qr.klassen.filter((k) => k.brutto > 0).map((k) => k.satz) : [6, 13, 23];
    zeilen.forEach((z, i) => {
      const t = zahl(z.text);
      const kopf = /(?:^|[^A-Za-zÀ-ÿ])(Uni|Un|Kg|Lt)(?=[^a-z]|[a-z]?[A-Z])[\s'’|:.,;_-]*/i;
      let m = new RegExp(kopf.source + "(.+?)\\s+(\\d{1,3})\\s*[%gx]\\s*(.*)$", 'i').exec(t);
      // das %-Zeichen wird oft als 4, 8 oder gar nicht gelesen („134“, „23 3,50“): dann nur die bekannten Sätze zulassen
      if (!m) m = new RegExp(kopf.source + "(.+?)\\s+(0|4|5|6|8|9|12|13|16|22|23)[48]?\\s+(-?\\d[\\d.,]*)\\s*$", 'i').exec(t);
      const sk = m ? satzKand(m[3], moegl) : [];
      if (m && sk.length) {
        const vor = t.slice(0, m.index + (m[0].toLowerCase().startsWith(m[1].toLowerCase()) ? 0 : 1)), q = /(\d{1,3})\s*[^\d\w]*$/.exec(vor);
        const pr = [...m[4].matchAll(PREIS)].map((x) => cent(x[1]));
        let name = m[2].replace(/^d(?=[A-Z])/, '').replace(/^[^\wÀ-ÿ]+/, '').replace(/[^\wÀ-ÿ.)]+$/, '').replace(/\s+/g, ' ').trim();
        let menge = q ? +q[1] : 1; if (menge > 20) menge = 1;
        const lesbar = buchstaben(name) >= 3;
        posten.push({ t: lesbar ? name : 'Posten (Name nicht lesbar)', b: pr.length ? pr[pr.length - 1] : null, menge, einzel: null, mwst: sk[0], satzK: sk, zeile: i, c: z.c, rep: null, nameUnsicher: !lesbar, rahmen: z.b });
        return;
      }
      // Name nicht lesbar („Uni“ fehlt), aber Steuersatz und genau ein Betrag am Ende: Zeile gehört trotzdem zu den Posten
      const nr = /^(.*?)\b(\d{1,2})\s*%\s*(-?\d+[,.]\d{2})\s*$/.exec(t);
      if (nr && SAETZE.includes(+nr[2]) && /\d/.test(nr[1]) && !/[pf]re[cçg]o|total|incid/i.test(t)) {
        const q = /^\W*(\d{1,3})\b/.exec(nr[1]); let nm = nr[1].replace(/^\W*\d{1,3}\b/, '').replace(/[^\wÀ-ÿ]+/g, ' ').trim();
        const lesbar = buchstaben(nm) >= 3;
        posten.push({ t: lesbar ? nm : 'Posten (Name nicht lesbar)', b: cent(nr[3]), menge: q && +q[1] <= 20 ? +q[1] : 1, einzel: null, mwst: +nr[2], zeile: i, c: z.c, rep: null, nameUnsicher: !lesbar, rahmen: z.b });
        return;
      }
      const pe = /[pf]r[eé][cçg]o\s*[:;.]?\s*(\d+[,.]\d{2})/i.exec(t);
      if (pe && posten.length) { posten[posten.length - 1].einzel = cent(pe[1]); return; }
      const ta = /^\W*(\d{1,2})\s*%\s+(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/.exec(t);
      if (ta && SAETZE.includes(+ta[1])) tabelle.push({ satz: +ta[1], brutto: cent(ta[2]) + cent(ta[3]) });
    });
    if (posten.length < 2) return null;
    // 1. Zwei Lesungen je Zeile: der Betrag am Zeilenende und Menge × „Preco“ (die Preco-Zeile ist meist besser gelesen).
    //    Die Menge wird auch aus Betrag ÷ Preco abgeleitet, falls sie falsch gelesen wurde.
    for (const p of posten) {
      p.kand = [];
      if (p.einzel) {
        if (p.menge && p.einzel * p.menge > 0) p.kand.push(p.einzel * p.menge);
        if (p.b != null && p.b % p.einzel === 0 && p.b / p.einzel <= 20 && !p.kand.includes(p.b)) p.kand.push(p.b);
      }
      if (p.b != null && !p.kand.includes(p.b)) p.kand.push(p.b);
      p.gelesen = p.b;
    }
    // 2. Klassen aus QR, sonst aus der Tabelle; je Steuersatz die Kombination der Lesungen suchen, die genau die Brutto-Summe ergibt
    const klassen = (qr && qr.klassen && qr.klassen.length ? qr.klassen : tabelle).map((k) => ({ ...k }));
    const quelleKl = qr && qr.klassen && qr.klassen.length ? 'qr' : tabelle.length ? 'tabelle' : null;
    // Lösung je Steuersatz, ohne etwas zu verändern: wählt je Zeile eine Lesung, sodass die Brutto-Summe genau stimmt
    const klasseLoesen = (k, mit) => {
      const feste = mit.filter((p) => p.kand.length), offen = mit.filter((p) => !p.kand.length);
      if (feste.length > 14 || offen.length > 1) return null;
      const n = feste.length, wahl = new Array(n).fill(0); let beste = null;
      const rek = (i, summe, abw) => {
        if (beste && abw > beste.abw) return;
        if (i === n) { const rest = k.brutto - summe; if (offen.length === 0 ? rest === 0 : rest > 0) if (!beste || abw < beste.abw) beste = { abw, wahl: wahl.slice(), rest, feste, offen }; return; }
        for (let c = 0; c < feste[i].kand.length; c++) { wahl[i] = c; rek(i + 1, summe + feste[i].kand[c], abw + (c ? 1 : 0)); }
      };
      rek(0, 0, 0); return beste;
    };
    // Zeilen mit mehreren möglichen Steuersätzen: alle Zuordnungen durchprobieren (höchstens 600), beste ohne Fehler nehmen
    const unklar = posten.filter((p) => p.satzK && p.satzK.length > 1);
    const zuordnungen = [[]]; for (const p of unklar) { const neuL = []; for (const z of zuordnungen) for (const s2 of p.satzK) neuL.push(z.concat(s2)); zuordnungen.splice(0, zuordnungen.length, ...neuL.slice(0, 600)); }
    let gewaehlt = null;
    if (klassen.length) {
      for (const z of zuordnungen) {
        unklar.forEach((p, i) => { p.mwst = z[i]; });
        const loesungen = klassen.map((k) => { const mit = posten.filter((p) => p.mwst === k.satz); return mit.length ? klasseLoesen(k, mit) : { leer: true }; });
        const fremd = posten.some((p) => !klassen.some((k) => k.satz === p.mwst));
        if (!fremd && loesungen.every(Boolean)) { gewaehlt = loesungen; break; }
      }
      if (!gewaehlt) unklar.forEach((p) => { p.mwst = p.satzK[0]; });
    }
    klassen.forEach((k, ki) => {
      const mit = posten.filter((p) => p.mwst === k.satz); if (!mit.length) { k.ist = 0; k.ok = k.brutto === 0; return; }
      const loesung = gewaehlt ? gewaehlt[ki] : klasseLoesen(k, mit);
      if (loesung && !loesung.leer) {
        loesung.feste.forEach((p, i) => { const v = p.kand[loesung.wahl[i]]; if (v !== p.gelesen) p.rep = p.einzel && v === p.einzel * p.menge ? 'Menge × Preis' : 'aus der Steuer-Summe'; p.b = v; p.sicher = true; });
        if (loesung.offen.length) { loesung.offen[0].b = loesung.rest; loesung.offen[0].rep = 'aus der Steuer-Summe'; loesung.offen[0].sicher = true; }
        k.ist = k.brutto; k.ok = true;
      } else {
        // keine Kombination passt: beste Einzellesung nehmen, Rest sichtbar machen, nichts schönreden
        for (const p of mit) { if (p.kand.length) p.b = p.kand[0]; p.sicher = false; }
        let ist = mit.reduce((a, p) => a + (p.b || 0), 0);
        if (ist < k.brutto) { posten.push({ t: `Nicht gelesen (${k.satz} %)`, b: k.brutto - ist, menge: 1, einzel: null, mwst: k.satz, zeile: -1, c: 0, rep: 'fehlender Rest', fehlt: true, sicher: false, kand: [] }); ist = k.brutto; }
        k.ist = ist; k.ok = false;
      }
    });
    if (!klassen.length) for (const p of posten) { if (p.b == null && p.kand.length) p.b = p.kand[0]; else if (p.kand.length && p.einzel && p.menge) p.b = p.kand[0]; }
    const total = qr ? qr.total : klassen.length && klassen.every((k) => k.ok) ? klassen.reduce((a, k) => a + k.brutto, 0) : null;
    const summe = posten.reduce((a, p) => a + (p.b || 0), 0);
    const nichtLesbar = posten.filter((p) => p.b == null).length;
    for (const p of posten) if (p.b == null) p.b = 0;
    return { zeilen: zeilen.map((z, i) => ({ text: z.text, b: z.b, c: z.c, typ: posten.some((p) => p.zeile === i) ? 'posten' : 'sonst', zu: posten.findIndex((p) => p.zeile === i) })), posten, total, totalZeile: -1, summe,
      pruefung: { klassen, quelle: quelleKl, gesamtOk: total != null && summe === total, nichtLesbar, repariert: posten.filter((p) => p.rep).length } };
  }

  // ---------- Rechnungs-QR-Code (AT-Spezifikation v1.1, Okt. 2020): Felder „Code:Wert“, mit * verbunden;
  // O = Gesamtbetrag mit Steuern, Punkt als Dezimaltrenner. Positionen stehen nicht darin. ----------
  function qrLesen(text) {
    if (!/^A:\d{9}\*/.test(text || '')) return null;
    const f = {};
    for (const teil of text.split('*')) { const i = teil.indexOf(':'); if (i > 0) f[teil.slice(0, i)] = teil.slice(i + 1); }
    if (!/^\d+\.\d{2}$/.test(f.O || '')) return null;
    const c = (k) => (/^\d+\.\d{2}$/.test(f[k] || '') ? Math.round(parseFloat(f[k]) * 100) : null);
    // Steuerklassen (Portaria 195/2020, Anlage): Region PT = I1; I2 befreit; I3/I4 Basis/IVA ermäßigt (6 %); I5/I6 mittel (13 %);
    // I7/I8 normal (23 %). Brutto je Klasse = Basis + IVA. Madeira I1→J…, Azoren K… (nicht geprüft, daher nur I-Felder).
    const kl = [];
    const klasse = (satz, b, v) => { if (b != null || v != null) kl.push({ satz, brutto: (b || 0) + (v || 0), basis: b, iva: v }); };
    if (f.I1 === 'PT' || f.I1 == null) { klasse(0, c('I2'), 0); klasse(6, c('I3'), c('I4')); klasse(13, c('I5'), c('I6')); klasse(23, c('I7'), c('I8')); }
    return { total: Math.round(parseFloat(f.O) * 100), nif: f.A, datum: f.F, dok: f.G, steuer: c('N'), klassen: kl };
  }
  async function ladeJsqr() {
    if (!window.jsQR) await new Promise((ok, fehler) => { const sc = document.createElement('script'); sc.src = basis().replace('tesseract/', 'jsqr/') + 'jsQR.js'; sc.onload = ok; sc.onerror = fehler; document.head.append(sc); });
  }
  // QR in einem großen, hohen Ausschnitt: in Kacheln in voller Auflösung absuchen (Verkleinern macht den Code unlesbar),
  // jede Kachel auch mit gestrecktem Kontrast und als Schwarz-Weiß-Bild
  // jsQR liest unscharfe Codes nur bei etwa 3–6 Pixeln je Modul: darum mehrere Verkleinerungen (0,35 zuerst: am Testbon die einzige, die ging)
  async function qrKacheln(c) {
    try {
      await ladeJsqr();
      const lies1 = (g, w, h, y) => { const d = g.getImageData(0, y, w, h), r = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' }); return r && qrLesen(r.data); };
      for (const sk of [0.41, 0.35, 0.3, 0.5, 0.25, 0.6, 0.7, 1]) {
        const k = document.createElement('canvas'); k.width = Math.max(1, Math.round(c.width * sk)); k.height = Math.max(1, Math.round(c.height * sk));
        const g = k.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0, k.width, k.height);
        if (k.height <= 2200) { const q = lies1(g, k.width, k.height, 0); if (q) return q; }
        const fh = Math.min(k.height, 900);
        for (let y = 0; y < k.height; y += 300) { const h = Math.min(fh, k.height - y), q = lies1(g, k.width, h, y); if (q) return q; if (y + h >= k.height) break; }
      }
    } catch (e) { /* kein QR */ }
    return null;
  }
  async function qrSuchen(daten) {
    const img = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = daten; });
    // 1. Eingebauter BarcodeDetector (Chrome Android); 2. jsQR 1.4.0 (Apache-2.0) für alle anderen, z. B. iOS Safari
    try {
      if ('BarcodeDetector' in window) {
        const d = new window.BarcodeDetector({ formats: ['qr_code'] });
        for (const c of await d.detect(img)) { const q = qrLesen(c.rawValue); if (q) return q; }
      }
    } catch (e) { /* weiter mit jsQR */ }
    try {
      if (!window.jsQR) await new Promise((ok, fehler) => { const sc = document.createElement('script'); sc.src = basis().replace('tesseract/', 'jsqr/') + 'jsQR.js'; sc.onload = ok; sc.onerror = fehler; document.head.append(sc); });
      for (const max of [1600, 2400, 1000]) {
        const f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
        const r = window.jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' });
        const q = r && qrLesen(r.data); if (q) return q;
      }
    } catch (e) { /* kein QR lesbar */ }
    return null;
  }

  function ladeBonbild() {
    if (window.BonBild) return Promise.resolve();
    return new Promise((ok, fehler) => { const sc = document.createElement('script'); sc.src = new URL('bonbild.js', location.href).href; sc.onload = ok; sc.onerror = () => fehler(new Error('bonbild.js fehlt')); document.head.append(sc); });
  }
  async function worterLesen(w, leinwand, psm) {
    await w.setParameters({ tessedit_pageseg_mode: String(psm) });
    const { data } = await w.recognize(leinwand, {}, { blocks: true, text: true });
    const woerter = [];
    for (const bl of data.blocks || []) for (const pa of bl.paragraphs || []) for (const li of pa.lines || []) for (const wo of li.words || []) woerter.push({ t: wo.text, c: wo.confidence, b: wo.bbox });
    return { woerter, roh: data.text || '' };
  }
  const drehen180 = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.translate(o.width, o.height); g.rotate(Math.PI); g.drawImage(c, 0, 0); return o; };
  // Güte eines Ergebnisses: Summe stimmt mit QR/Tabelle > sichere Posten > viele Posten > sichere Wörter
  function guete(r, woerter) {
    const sicher = r.posten.filter((p) => p.sicher).length, gut = woerter.filter((x) => x.c > 70).length;
    return (r.pruefung && r.pruefung.gesamtOk ? 10000 : 0) + (r.total != null && r.summe === r.total ? 5000 : 0) + sicher * 100 + r.posten.length * 20 + Math.min(gut, 400) * 0.1;
  }
  // Name aus einer neu gelesenen Zeile ziehen („… Uni NAME 13% …“)
  function nameAusZeile(t) {
    const m = /(?:^|[^A-Za-zÀ-ÿ])(Uni|Un|Kg|Lt)(?=[^a-z]|[a-z]?[A-Z])[\s'’|:.,;_-]*(.+?)\s+(?:\d{1,2}\s*[%gx48]|\d{1,2}\s+\d)/i.exec(t);
    if (!m) return null;
    const n = m[2].replace(/^d(?=[A-Z])/, '').replace(/^[^\wÀ-ÿ]+/, '').replace(/[^\wÀ-ÿ.)]+$/, '').replace(/\s+/g, ' ').trim();
    return buchstaben(n) >= 3 ? n : null;
  }
  // Zweiter, genauer Blick auf unsichere Zeilen: Zeile ausschneiden, 2,5-fach vergrößern, einzeln lesen (PSM 7)
  async function nachlesen(w, leinwand, posten) {
    for (const p of posten) {
      if (!p.rahmen || !(p.nameUnsicher || p.c < 80)) continue;
      const r = p.rahmen, pad = Math.round((r.y1 - r.y0) * 0.35), x0 = Math.max(0, r.x0 - pad), y0 = Math.max(0, r.y0 - pad), bw = Math.min(leinwand.width - x0, r.x1 - r.x0 + 2 * pad), bh = Math.min(leinwand.height - y0, r.y1 - r.y0 + 2 * pad);
      if (bw < 20 || bh < 10) continue;
      const k = 2.5, c = document.createElement('canvas'); c.width = Math.round(bw * k); c.height = Math.round(bh * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(leinwand, x0, y0, bw, bh, 0, 0, c.width, c.height);
      try {
        const l = await worterLesen(w, c, 7), n = nameAusZeile(zeilenAus(l.woerter).map((z) => z.text).join(' '));
        if (n && (p.nameUnsicher || n !== p.t)) { const c2 = l.woerter.length ? l.woerter.reduce((a, x) => a + x.c, 0) / l.woerter.length : 0; const gleich = n.replace(/\s/g, '').toLowerCase() === p.t.replace(/\s/g, '').toLowerCase(); if (p.nameUnsicher || (!gleich && c2 > p.c + 10)) { p.t = n; p.nameUnsicher = false; } }
      } catch (e) { /* alter Name bleibt */ }
    }
  }
  // Neuronale Erkennung (ocr.js, PaddleOCR) wenn ihre Dateien da sind, sonst Tesseract wie bisher
  let neuronal = null;
  async function paddleDa() {
    if (neuronal !== null) return neuronal;
    try {
      if (!window.FasanOCR) await new Promise((ok, fehler) => { const sc = document.createElement('script'); sc.src = new URL('ocr.js', location.href).href; sc.onload = ok; sc.onerror = fehler; document.head.append(sc); });
      neuronal = await window.FasanOCR.verfuegbar();
    } catch (e) { neuronal = false; }
    return neuronal;
  }
  function fotoLeinwand(img, max = 2200) {
    const f = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * f); c.height = Math.round(img.height * f); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
  }
  // Bildausschnitt der Zeile je Posten: In der App steht das Original direkt neben der Lesung, ein Blick genügt zum Prüfen
  function schnipsel(c, r) {
    if (!r) return null;
    const h = r.y1 - r.y0, pad = Math.round(h * 0.25), x0 = Math.max(0, Math.round(r.x0 - pad)), y0 = Math.max(0, Math.round(r.y0 - pad));
    const bw = Math.min(c.width - x0, Math.round(r.x1 - r.x0 + 2 * pad)), bh = Math.min(c.height - y0, Math.round(h + 2 * pad));
    if (bw < 8 || bh < 6) return null;
    const f = Math.min(1, 56 / bh), k = document.createElement('canvas'); k.width = Math.round(bw * f); k.height = Math.round(bh * f);
    k.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, k.width, k.height);
    return k.toDataURL('image/jpeg', 0.8);
  }
  async function erkenne(daten, melde, opt = {}) {
    const paddle = opt.motor !== 'tesseract' && await paddleDa();
    const w = paddle ? null : await bereit(melde);
    // 1. Bon im Foto finden und entzerren (bonbild.js)
    let ausschnitt = null, foto = null;
    try {
      await ladeBonbild();
      const BB = window.BonBild, img = await BB.laden(daten), f = BB.finde(img); foto = img;
      if (f) {
        let ec = f.ecken; const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
        // Tesseract: Bon liegt quer, wenn er breiter als hoch ist. Mit PaddleOCR wird stattdessen die Schriftrichtung gemessen
        // (kurze Bons sind oft breiter als hoch und würden sonst um 90° falsch gedreht).
        if (!paddle && d(ec[0], ec[1]) > d(ec[0], ec[3])) ec = [ec[3], ec[0], ec[1], ec[2]];
        let e = BB.entzerre(img, ec), sc = BB.gerade(e.canvas);
        if (paddle && await window.FasanOCR.hochkant(e.canvas)) { ec = [ec[3], ec[0], ec[1], ec[2]]; e = BB.entzerre(img, ec); sc = BB.gerade(e.canvas); }
        ausschnitt = { canvas: sc.canvas, roh: e.canvas, ecken: ec };
      }
    } catch (e) { ausschnitt = null; }
    let qr = await qrSuchen(daten);
    if (!qr && ausschnitt) qr = await qrKacheln(ausschnitt.roh) || await qrSuchen(ausschnitt.roh.toDataURL('image/jpeg', 0.9)) || await qrKacheln(ausschnitt.canvas);
    const versuche = []; let beste = null;
    const lauf = async (leinwand, psm, name, ecken) => {
      let v, woerter, roh = '';
      if (paddle) { v = { canvas: leinwand, winkel: 0 }; woerter = await window.FasanOCR.woerter(leinwand, { melde }); }
      else { v = await vorbereiten(leinwand, !!ecken); const l = await worterLesen(w, v.canvas, psm); woerter = l.woerter; roh = l.roh; }
      const r = lies(zeilenAus(woerter), qr), g = guete(r, woerter);
      versuche.push(`${name}:${Math.round(g)}`);
      if (!beste || g > beste.g) beste = { g, r, v, roh, name, ecken };
      lauf.lesbar = woerter.length ? woerter.filter((x) => x.c > 80).length / woerter.length : 0;
      return g;
    };
    // 2. Gerader Ausschnitt, bei schlechtem Ergebnis um 180° gedreht, zuletzt das ganze Foto. Bestes Ergebnis gewinnt.
    if (ausschnitt) {
      const g1 = await lauf(ausschnitt.canvas, 6, 'ausschnitt', ausschnitt.ecken);
      // um 180° nur, wenn die Schrift unlesbar war (auf dem Kopf); sonst lag es am Ausschnitt, nicht an der Richtung
      if (g1 < 5000 && (!paddle || lauf.lesbar < 0.5)) await lauf(drehen180(ausschnitt.canvas), 6, 'ausschnitt180', ausschnitt.ecken);
    }
    if (!beste || beste.g < 5000) {
      // ganzes Foto: Schräglage vorher ausgleichen (Projektionsprofil, wie bei Tesseract), sonst rutschen Preise in die Nachbarzeile
      // PaddleOCR braucht keine Vorverarbeitung; Kontrast-Strecken löscht blassen Druck sogar (Test 29.10.: Preise weg).
      // Schräge Zeilen fängt die Neigung je Textkasten auf (zeilenAus).
      if (paddle) { if (!foto) foto = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = daten; }); await lauf(fotoLeinwand(foto), 11, 'foto', null); }
      else await lauf(daten, 11, 'foto', null);
    }
    const { r, v, roh, name, ecken } = beste;
    if (!paddle && name !== 'foto') await nachlesen(w, v.canvas, r.posten.filter((p) => !p.fehlt));
    for (const p of r.posten) p.schnipsel = schnipsel(v.canvas, p.rahmen || (r.zeilen[p.zeile] && r.zeilen[p.zeile].b));
    return { ...r, qr, quelle: name, motor: paddle ? 'paddle' : 'tesseract', versuche, breite: v.canvas.width, hoehe: v.canvas.height, bild: v.canvas.toDataURL('image/jpeg', 0.82), winkel: v.winkel, roh, ecken };
  }
  return { erkenne, bereit, qrKacheln, vorbereiten, worterLesen, lies, liesAllgemein, abgleich, zeilenAus, cent, qrLesen, qrSuchen, paddleDa };
})();
