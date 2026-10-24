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
  function schraeglage(y, w, h) {
    const f = Math.min(1, 700 / Math.max(w, h)), pts = [];
    for (let j = 0; j < h; j += Math.max(1, Math.round(1 / f))) for (let i = 0; i < w; i += Math.max(1, Math.round(1 / f))) if (y[j * w + i] < 110) pts.push(i * f, j * f);
    if (pts.length < 200) return 0;
    let besterW = 0, besteV = -1;
    for (let gr = -10; gr <= 10; gr += 0.5) {
      const t = (gr * Math.PI) / 180, sin = Math.sin(t), cos = Math.cos(t), bins = new Map();
      for (let k = 0; k < pts.length; k += 2) { const r = Math.round(pts[k + 1] * cos - pts[k] * sin); bins.set(r, (bins.get(r) || 0) + 1); }
      let s = 0, s2 = 0; for (const v of bins.values()) { s += v; s2 += v * v; }
      const v = s2 / bins.size - (s / bins.size) ** 2;
      if (v > besteV) { besteV = v; besterW = gr; }
    }
    return besterW;
  }
  function vorbereiten(daten) {
    return new Promise((ok, fehler) => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(2.5, 2200 / Math.max(img.width, img.height));
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
        const winkel = schraeglage(flach, c.width, c.height);
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
      img.src = daten;
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

  function lies(zeilen) {
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

  // ---------- Rechnungs-QR-Code (AT-Spezifikation v1.1, Okt. 2020): Felder „Code:Wert“, mit * verbunden;
  // O = Gesamtbetrag mit Steuern, Punkt als Dezimaltrenner. Positionen stehen nicht darin. ----------
  function qrLesen(text) {
    if (!/^A:\d{9}\*/.test(text || '')) return null;
    const f = {};
    for (const teil of text.split('*')) { const i = teil.indexOf(':'); if (i > 0) f[teil.slice(0, i)] = teil.slice(i + 1); }
    if (!/^\d+\.\d{2}$/.test(f.O || '')) return null;
    return { total: Math.round(parseFloat(f.O) * 100), nif: f.A, datum: f.F, dok: f.G, steuer: /^\d+\.\d{2}$/.test(f.N || '') ? Math.round(parseFloat(f.N) * 100) : null };
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

  async function erkenne(daten, melde) {
    const w = await bereit(melde);
    const v = await vorbereiten(daten);
    const { data } = await w.recognize(v.canvas, {}, { blocks: true, text: true });
    const woerter = [];
    for (const bl of data.blocks || []) for (const pa of bl.paragraphs || []) for (const li of pa.lines || []) for (const wo of li.words || []) woerter.push({ t: wo.text, c: wo.confidence, b: wo.bbox });
    const z = zeilenAus(woerter);
    // Rahmen beziehen sich auf das vorbereitete (gerade gedrehte) Bild; das zeigt die App auch an
    const qr = await qrSuchen(daten);
    return { ...lies(z), qr, breite: v.canvas.width, hoehe: v.canvas.height, bild: v.canvas.toDataURL('image/jpeg', 0.82), winkel: v.winkel, roh: data.text || '' };
  }
  return { erkenne, bereit, lies, zeilenAus, cent, qrLesen, qrSuchen };
})();
