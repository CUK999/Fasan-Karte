'use strict';
/* Fasan Karte – Kassenzettel lesen, ganz im Handy. MPL-2.0
 * Texterkennung: tesseract.js 5.1.1 (Apache-2.0) mit portugiesischen Sprachdaten (4.0.0_best_int), vendor/tesseract/.
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
    const w = woerter.filter((x) => x.t.trim() && x.c > 15).map((x) => ({ ...x, cy: (x.b.y0 + x.b.y1) / 2, h: x.b.y1 - x.b.y0 }));
    w.sort((a, b) => a.b.x0 - b.b.x0);
    const zeilen = [];
    for (const x of w) {
      let beste = null, bestD = Infinity;
      for (const z of zeilen) {
        const letztes = z.w[z.w.length - 1];
        if (letztes.b.x1 > x.b.x0 + x.h) continue; // überlappt waagrecht: andere Zeile
        const d = Math.abs(letztes.cy - x.cy);
        if (d < 0.55 * Math.max(x.h, letztes.h) && d < bestD) { beste = z; bestD = d; }
      }
      if (beste) beste.w.push(x); else zeilen.push({ w: [x] });
    }
    for (const z of zeilen) {
      z.b = { x0: Math.min(...z.w.map((x) => x.b.x0)), y0: Math.min(...z.w.map((x) => x.b.y0)), x1: Math.max(...z.w.map((x) => x.b.x1)), y1: Math.max(...z.w.map((x) => x.b.y1)) };
      z.c = Math.min(...z.w.map((x) => x.c));
      z.text = z.w.map((x) => x.t).join(' ').replace(/\s+/g, ' ').trim();
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

  function lies(zeilen, qr) {
    const pt = liesPT(zeilen, qr); if (pt) return pt;
    const out = zeilen.map((z) => {
      const t = zahl(z.text);
      const preise = [...t.matchAll(PREIS)].map((m) => ({ s: m[1], i: m.index }));
      const letzter = preise.length ? preise[preise.length - 1] : null;
      const menge = /^\s*\d+([.,]\d+)?\s*(x|kg)\b/i.test(t) || /\b\d+([.,]\d+)?\s*kg\s*x\b/i.test(t);
      return { z, t, preise, letzter, menge, bu: buchstaben(t), typ: 'sonst' };
    });
    let total = null, totalZeile = -1;
    const posten = [];
    for (let i = 0; i < out.length; i++) {
      const r = out[i];
      if (TOTAL.test(r.t) && !/sub-?total/i.test(r.t) && r.letzter) { const c = cent(r.letzter.s); if (total == null || c > total) { total = c; totalZeile = i; } r.typ = 'summe'; continue; }
      if (NEIN.test(r.t) && !/desconto/i.test(r.t)) { r.typ = 'nein'; continue; }
      if (!r.letzter) continue;
      // Name mit Stückpreis, darunter „3 X 0,79“: der Zeilenbetrag kommt später, diese Zeile liefert nur den Namen
      // (nur wenn die Mengenzeile keinen eigenen Namen hat, sonst ist sie ein eigener Posten wie „2 X Cafe 0,90 1,80“)
      if (r.bu >= 2 && !r.menge && i + 1 < out.length && out[i + 1].menge && out[i + 1].bu < 2) { r.typ = 'sonst'; r.nurName = true; continue; }
      const betrag = cent(r.letzter.s);
      if (!betrag || Math.abs(betrag) > 100000) continue;
      // Mengenzeile „3 X 0,79“ ohne Endbetrag: Betrag steht in der nächsten Zeile
      if (r.menge && r.preise.length === 1 && i + 1 < out.length && out[i + 1].letzter && out[i + 1].bu === 0) continue;
      let name = r.t.slice(0, r.letzter.i).replace(/^\s*\d+([.,]\d+)?\s*(x|kg)\s*(x\s*)?/i, '').replace(PREIS, '').replace(/\S*(eur|\/\s*k|kg)\S*/gi, '').replace(/\b[xX]\b/g, '').replace(/\s+[A-Z]{1,2}\s*$/, '').replace(/\s+/g, ' ').trim();
      // Kein eigener Name (nur Zahlen/Einheiten): Name aus der Zeile darüber, wenn die keinen eigenen Preis hat
      if (buchstaben(name) < 2) {
        for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
          if (out[k].bu >= 2 && (out[k].nurName || !out[k].letzter) && out[k].typ === 'sonst') {
            name = (out[k].nurName ? out[k].t.slice(0, out[k].letzter.i) : out[k].t).replace(/\s+kg\s*$/i, '').replace(/\s+[A-Z]{1,2}\s*$/, '').trim();
            out[k].typ = 'teil'; out[k].zu = posten.length; break;
          }
          if (out[k].bu >= 2 && out[k].letzter) break;
        }
      }
      name = name.replace(/^[^\wÀ-ÿ]+/, '').slice(0, 40);
      if (!name && betrag > 0) name = 'Posten';
      r.typ = 'posten'; r.zu = posten.length;
      posten.push({ t: name || (betrag < 0 ? 'Rabatt' : 'Posten'), b: betrag, zeile: i, c: r.z.c });
    }
    const summe = posten.reduce((a, p) => a + p.b, 0);
    return { zeilen: out.map((r) => ({ text: r.z.text, b: r.z.b, c: r.z.c, typ: r.typ, zu: r.zu })), posten, total, totalZeile, summe };
  }


  // ---------- Portugiesischer Bon (Zone Soft u. a.): „2 Uni PIZZA PEPPERONI 13% 25,80“, darunter „Preco: 12,90/Uni“.
  // Prüfen: Summe der Zeilen je Steuersatz gegen die Brutto-Beträge im QR-Code (oder die TAXA-Tabelle des Bons), Gesamtsumme gegen QR.
  const SAETZE = [0, 4, 5, 6, 8, 9, 12, 13, 16, 22, 23];
  const fehlt2 = (posten, k) => posten.some((p) => p.fehlt && p.mwst === k.satz);
  function liesPT(zeilen, qr) {
    const posten = [];
    let tabelle = [];
    zeilen.forEach((z, i) => {
      const t = zahl(z.text);
      const kopf = /(?:^|[^A-Za-zÀ-ÿ])(Uni|Un|Kg|Lt)(?=[^a-z]|[a-z]?[A-Z])[\s'’|:.,;_-]*/i;
      let m = new RegExp(kopf.source + "(.+?)\\s+(\\d{1,2})\\s*[%gx]\\s*(.*)$", 'i').exec(t);
      // das %-Zeichen wird oft als 4, 8 oder gar nicht gelesen („134“, „23 3,50“): dann nur die bekannten Sätze zulassen
      if (!m) m = new RegExp(kopf.source + "(.+?)\\s+(0|4|5|6|8|9|12|13|16|22|23)[48]?\\s+(-?\\d[\\d.,]*)\\s*$", 'i').exec(t);
      if (m && SAETZE.includes(+m[3])) {
        const vor = t.slice(0, m.index + (m[0].toLowerCase().startsWith(m[1].toLowerCase()) ? 0 : 1)), q = /(\d{1,3})\s*[^\d\w]*$/.exec(vor);
        const pr = [...m[4].matchAll(PREIS)].map((x) => cent(x[1]));
        let name = m[2].replace(/^d(?=[A-Z])/, '').replace(/^[^\wÀ-ÿ]+/, '').replace(/[^\wÀ-ÿ.)]+$/, '').replace(/\s+/g, ' ').trim();
        let menge = q ? +q[1] : 1; if (menge > 20) menge = 1;
        posten.push({ t: name || 'Posten', b: pr.length ? pr[pr.length - 1] : null, menge, einzel: null, mwst: +m[3], zeile: i, c: z.c, rep: null });
        return;
      }
      // Name nicht lesbar („Uni“ fehlt), aber Steuersatz und genau ein Betrag am Ende: Zeile gehört trotzdem zu den Posten
      const nr = /^(.*?)\b(\d{1,2})\s*%\s*(-?\d+[,.]\d{2})\s*$/.exec(t);
      if (nr && SAETZE.includes(+nr[2]) && /\d/.test(nr[1]) && !/pre[cç]o|total|incid/i.test(t)) {
        const q = /^\W*(\d{1,3})\b/.exec(nr[1]); let nm = nr[1].replace(/^\W*\d{1,3}\b/, '').replace(/[^\wÀ-ÿ]+/g, ' ').trim();
        const lesbar = buchstaben(nm) >= 3;
        posten.push({ t: lesbar ? nm : 'Posten (Name nicht lesbar)', b: cent(nr[3]), menge: q && +q[1] <= 20 ? +q[1] : 1, einzel: null, mwst: +nr[2], zeile: i, c: z.c, rep: null, nameUnsicher: !lesbar });
        return;
      }
      const pe = /pre[cç]o\s*:?\s*(\d+[,.]\d{2})/i.exec(t);
      if (pe && posten.length) { posten[posten.length - 1].einzel = cent(pe[1]); return; }
      const ta = /^\W*(\d{1,2})\s*%\s+(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/.exec(t);
      if (ta && SAETZE.includes(+ta[1])) tabelle.push({ satz: +ta[1], brutto: cent(ta[2]) + cent(ta[3]) });
    });
    if (posten.length < 2) return null;
    // 1. Menge × Einzelpreis
    for (const p of posten) {
      if (p.einzel && p.menge) { const e = p.einzel * p.menge; if (p.b == null) { p.b = e; p.rep = 'Menge × Preis'; } else if (p.b !== e) p.zweifel = e; }
    }
    // 2. Klassen aus QR, sonst aus der Tabelle
    const klassen = (qr && qr.klassen && qr.klassen.length ? qr.klassen : tabelle).map((k) => ({ ...k }));
    const quelleKl = qr && qr.klassen && qr.klassen.length ? 'qr' : tabelle.length ? 'tabelle' : null;
    for (const k of klassen) {
      const mit = posten.filter((p) => p.mwst === k.satz); if (!mit.length) { k.ist = 0; k.ok = k.brutto === 0; continue; }
      const fehlt = mit.filter((p) => p.b == null);
      let ist = mit.reduce((a, p) => a + (p.b || 0), 0);
      if (fehlt.length === 1 && k.brutto - ist > 0) { fehlt[0].b = k.brutto - ist; fehlt[0].rep = 'aus der Steuer-Summe'; ist = k.brutto; }
      if (ist !== k.brutto) { // ein Betrag falsch gelesen? Menge × Preis probieren, dann jede einzelne Zeile als Kandidaten
        for (const p of mit) if (p.zweifel != null && ist - p.b + p.zweifel === k.brutto) { p.rep = 'Menge × Preis'; ist = k.brutto; p.b = p.zweifel; break; }
      }
      if (ist < k.brutto && mit.length) { // Zeile(n) nicht gelesen: Rest als eigener, sichtbarer Posten, nie in eine fremde Zeile hineinrechnen
        posten.push({ t: `Nicht gelesen (${k.satz} %)`, b: k.brutto - ist, menge: 1, einzel: null, mwst: k.satz, zeile: -1, c: 0, rep: 'fehlender Rest', fehlt: true, sicher: false }); ist = k.brutto;
      }
      k.ist = ist; k.ok = ist === k.brutto;
      for (const p of mit) p.sicher = k.ok && !fehlt2(posten, k);
    }
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
  async function erkenne(daten, melde) {
    const w = await bereit(melde);
    // 1. Bon im Foto finden und entzerren (bonbild.js); 2. Zeilen lesen (PSM 6 auf dem geraden Ausschnitt), bei schlechtem
    // Ergebnis um 180° gedreht noch einmal; 3. zuletzt das ganze Foto (PSM 11). Es gewinnt das Ergebnis mit der besten Güte.
    let ausschnitt = null;
    try {
      await ladeBonbild();
      const BB = window.BonBild, img = await BB.laden(daten), f = BB.finde(img);
      if (f) {
        let ec = f.ecken; const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d(ec[0], ec[1]) > d(ec[0], ec[3])) ec = [ec[3], ec[0], ec[1], ec[2]]; // Bon liegt quer: lange Seite nach oben/unten
        const e = BB.entzerre(img, ec); const sc = BB.gerade(e.canvas);
        ausschnitt = { canvas: sc.canvas, roh: e.canvas, ecken: ec };
      }
    } catch (e) { ausschnitt = null; }
    let qr = await qrSuchen(daten);
    if (!qr && ausschnitt) { try { qr = await qrSuchen(ausschnitt.roh.toDataURL('image/jpeg', 0.9)) || await qrSuchen(ausschnitt.canvas.toDataURL('image/jpeg', 0.9)); } catch (e) { /* ohne QR */ } }
    const versuche = []; let beste = null;
    const lauf = async (quelleBild, gerade, psm, name, ecken) => {
      const v = await vorbereiten(quelleBild, gerade), l = await worterLesen(w, v.canvas, psm), z = zeilenAus(l.woerter), r = lies(z, qr);
      const g = guete(r, l.woerter); versuche.push(`${name}:${Math.round(g)}`);
      if (!beste || g > beste.g) beste = { g, r, v, l, name, ecken };
      return g;
    };
    if (ausschnitt) {
      const g1 = await lauf(ausschnitt.canvas, true, 6, 'ausschnitt', ausschnitt.ecken);
      if (g1 < 5000) await lauf(drehen180(ausschnitt.canvas), true, 6, 'ausschnitt180', ausschnitt.ecken);
    }
    if (!beste || beste.g < 5000) await lauf(daten, false, 11, 'foto', null);
    const { r, v, l, name, ecken } = beste;
    return { ...r, qr, quelle: name, versuche, breite: v.canvas.width, hoehe: v.canvas.height, bild: v.canvas.toDataURL('image/jpeg', 0.82), winkel: v.winkel, roh: l.roh, ecken };
  }
  return { erkenne, bereit, lies, zeilenAus, cent, qrLesen, qrSuchen };
})();
