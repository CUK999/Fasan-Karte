'use strict';
/* Fasan Karte – neuronale Texterkennung im Handy. MPL-2.0
 * Modelle: PaddleOCR PP-OCRv5 (Apache-2.0), Erkennung „mobile det“ und Latein-Leser (32 Sprachen, u. a. DE, PT, ES, FR, IT, EN),
 * als ONNX aus ppu-paddle-ocr-models, ausgeführt mit onnxruntime-web (MIT). Dateien: vendor/paddle/ (siehe DATEIEN.txt).
 * Parameter aus der offiziellen PaddleOCR-Konfiguration (configs/det/PP-OCRv5/PP-OCRv5_mobile_det.yml,
 * configs/rec/PP-OCRv5/multi_language/latin_PP-OCRv5_mobile_rec.yml, abgerufen 29.10.2026):
 *  - Erkennung: Bild BGR, (x/255 − Mittel)/Streuung mit Mittel 0,485/0,456/0,406 und Streuung 0,229/0,224/0,225,
 *    Seiten auf Vielfache von 32; Nachbearbeitung DB: Schwelle 0,3, Kasten-Schwelle 0,6, Aufweitung 1,5.
 *  - Lesen: Höhe 48 px, Breite nach Seitenverhältnis, (x/255 − 0,5)/0,5; CTC mit Leerzeichen-Klasse (use_space_char).
 * Zusätzlich liefert jedes Zeichen die zweitbeste Lesung mit Wahrscheinlichkeit: Daraus baut bon.js Alternativen für
 * unsichere Ziffern, die Summenprüfung wählt dann die passende.
 * Das Foto verlässt das Gerät nie; ohne Threads (GitHub Pages kann keine COOP/COEP-Header setzen).
 */
window.FasanOCR = (() => {
  const basis = () => new URL('vendor/paddle/', location.href).href;
  let laedt = null, M = null;

  function skript(src) {
    return new Promise((ok, fehler) => {
      if (window.ort) { ok(); return; }
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fehler(new Error('onnxruntime fehlt'));
      document.head.append(s);
    });
  }
  // Datei laden mit Fortschritt (Modelle sind 5–8 MB, beim ersten Mal sichtbar)
  async function holen(url, melde, anteil, start) {
    const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`);
    const gesamt = +r.headers.get('content-length') || 0;
    if (!r.body || !gesamt || !melde) return new Uint8Array(await r.arrayBuffer());
    const leser = r.body.getReader(), teile = []; let n = 0;
    for (;;) { const { done, value } = await leser.read(); if (done) break; teile.push(value); n += value.length; melde({ status: 'loading paddle', progress: start + anteil * Math.min(1, n / gesamt) }); }
    const out = new Uint8Array(n); let o = 0; for (const t of teile) { out.set(t, o); o += t.length; } return out;
  }
  async function lade(melde) {
    if (M) return M;
    if (!laedt) {
      laedt = (async () => {
        await skript(basis() + 'ort.wasm.min.js');
        const ort = window.ort;
        ort.env.wasm.wasmPaths = basis(); ort.env.wasm.numThreads = 1;
        const [det, rec, dictText] = await Promise.all([
          holen(basis() + 'det.onnx', melde, 0.4, 0), holen(basis() + 'rec-latin.onnx', melde, 0.6, 0.4),
          fetch(basis() + 'dict-latin.txt').then((r) => { if (!r.ok) throw new Error('Wörterbuch fehlt'); return r.text(); })]);
        const opt = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
        const sDet = await ort.InferenceSession.create(det, opt), sRec = await ort.InferenceSession.create(rec, opt);
        // Wörterbuch: eine Zeile je Zeichen; leere Zeilen am Ende weg. Klassen = Leer-Klasse + Zeichen + Leerzeichen.
        const zeichen = dictText.replace(/\r/g, '').split('\n'); while (zeichen.length && zeichen[zeichen.length - 1] === '') zeichen.pop();
        M = { ort, sDet, sRec, zeichen, klassen: null };
        return M;
      })().catch((e) => { laedt = null; throw e; });
    }
    return laedt;
  }
  async function verfuegbar() {
    try { const r = await fetch(basis() + 'DATEIEN.txt', { method: 'HEAD' }); return r.ok; } catch (e) { return false; }
  }

  // ---------- Erkennung (wo steht Text?) ----------
  function bgrTensor(g, w, h, mittel, streu) {
    const p = g.getImageData(0, 0, w, h).data, n = w * h, t = new Float32Array(3 * n);
    // Reihenfolge B, G, R wie in PaddleOCR (cv2 liest BGR); Mittel/Streuung in derselben Reihenfolge angewendet
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      t[i] = (p[j + 2] / 255 - mittel[0]) / streu[0];
      t[n + i] = (p[j + 1] / 255 - mittel[1]) / streu[1];
      t[2 * n + i] = (p[j] / 255 - mittel[2]) / streu[2];
    }
    return t;
  }
  // Größe für die Erkennung: höchstens ~2,4 Mio. Pixel und 2560 px lange Seite (Speicher im Handy), mindestens 32
  function detGroesse(w, h) {
    let f = Math.min(1, 2560 / Math.max(w, h), Math.sqrt(2.4e6 / (w * h)));
    const ww = Math.max(32, Math.round((w * f) / 32) * 32), hh = Math.max(32, Math.round((h * f) / 32) * 32);
    return { ww, hh, fx: ww / w, fy: hh / h };
  }
  async function finde(leinwand, opt = {}) {
    const m = await lade(opt.melde);
    const { ww, hh, fx, fy } = detGroesse(leinwand.width, leinwand.height);
    const c = document.createElement('canvas'); c.width = ww; c.height = hh;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(leinwand, 0, 0, ww, hh);
    const x = new m.ort.Tensor('float32', bgrTensor(g, ww, hh, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]), [1, 3, hh, ww]);
    const aus = await m.sDet.run({ [m.sDet.inputNames[0]]: x });
    const karte = aus[m.sDet.outputNames[0]].data; // 1×1×hh×ww, Wahrscheinlichkeit „Text“
    return kaesten(karte, ww, hh, opt).map((k) => ({ ...k, x0: k.x0 / fx, x1: k.x1 / fx, y0: k.y0 / fy, y1: k.y1 / fy, neig: k.neig == null ? null : (k.neig * fx) / fy }));
  }
  // DB-Nachbearbeitung: Schwelle 0,3 → zusammenhängende Flächen (4er-Nachbarschaft) → mittlere Wahrscheinlichkeit ≥ 0,6 →
  // Rechteck aufweiten um Fläche × 1,5 / Umfang (wie „unclip“ im Original, für achsenparallele Rechtecke).
  // Der Bon ist vorher entzerrt und gerade gedreht (bonbild.js), daher genügen achsenparallele Kästen.
  function kaesten(p, w, h, opt) {
    const schwelle = opt.schwelle || 0.3, kastenSchwelle = opt.kastenSchwelle || 0.6, auf = opt.aufweiten || 1.5;
    const marke = new Int32Array(w * h), stapel = new Int32Array(w * h), out = [];
    let nr = 0;
    for (let s = 0; s < w * h; s++) {
      if (marke[s] || p[s] <= schwelle) continue;
      nr++; let oben = 0; stapel[oben++] = s; marke[s] = nr;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, summe = 0, anzahl = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      while (oben) {
        const i = stapel[--oben], x = i % w, y = (i - x) / w;
        summe += p[i]; anzahl++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !marke[i - 1] && p[i - 1] > schwelle) { marke[i - 1] = nr; stapel[oben++] = i - 1; }
        if (x < w - 1 && !marke[i + 1] && p[i + 1] > schwelle) { marke[i + 1] = nr; stapel[oben++] = i + 1; }
        if (y > 0 && !marke[i - w] && p[i - w] > schwelle) { marke[i - w] = nr; stapel[oben++] = i - w; }
        if (y < h - 1 && !marke[i + w] && p[i + w] > schwelle) { marke[i + w] = nr; stapel[oben++] = i + w; }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (anzahl < 12 || Math.min(bw, bh) < 3) continue;
      const guete = summe / anzahl; if (guete < kastenSchwelle) continue;
      const d = (bw * bh * auf) / (2 * (bw + bh));
      // Neigung der Textzeile aus den Momenten der Fläche (Hauptachse); nur bei langen Flächen verlässlich.
      // Damit bleiben Name und Preis auch bei schräg fotografierten Bons in derselben Zeile (bon.js, zeilenAus).
      const mx = sx / anzahl, my = sy / anzahl, cxx = sxx / anzahl - mx * mx, cyy = syy / anzahl - my * my, cxy = sxy / anzahl - mx * my;
      const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy), neig = bw > 2.5 * bh && Math.abs(th) < 0.35 ? Math.tan(th) : null;
      out.push({ x0: Math.max(0, x0 - d), y0: Math.max(0, y0 - d), x1: Math.min(w, x1 + 1 + d), y1: Math.min(h, y1 + 1 + d), guete, neig });
    }
    return out;
  }

  // ---------- Lesen (was steht im Kasten?) ----------
  async function liesKasten(leinwand, k, m) {
    const kh = k.y1 - k.y0, kw = k.x1 - k.x0; if (kh < 4 || kw < 4) return null;
    const H = 48, W = Math.max(16, Math.min(1600, Math.round((H * kw) / kh)));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(leinwand, k.x0, k.y0, kw, kh, 0, 0, W, H);
    const t = bgrTensor(g, W, H, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
    const aus = await m.sRec.run({ [m.sRec.inputNames[0]]: new m.ort.Tensor('float32', t, [1, 3, H, W]) });
    const o = aus[m.sRec.outputNames[0]], [, T, C] = o.dims, d = o.data;
    if (!m.klassen) {
      // Klassen an die Ausgabe anpassen: Leer-Klasse vorn, Leerzeichen hinten (falls die Ausgabe eine Klasse mehr hat)
      // (die Latein-Datei aus ppu-paddle-ocr-models beginnt schon mit einer leeren Zeile für die Leer-Klasse)
      m.klassen = m.zeichen[0] === '' ? m.zeichen.slice() : ['', ...m.zeichen]; if (C === m.klassen.length + 1) m.klassen.push(' ');
      if (C !== m.klassen.length) console.warn('Wörterbuch passt nicht zum Modell', C, m.klassen.length);
    }
    const zeichen = []; let vorher = 0, summe = 0;
    for (let i = 0; i < T; i++) {
      let b1 = 0, p1 = -1, b2 = 0, p2 = -1; const o0 = i * C;
      for (let j = 0; j < C; j++) { const v = d[o0 + j]; if (v > p1) { b2 = b1; p2 = p1; b1 = j; p1 = v; } else if (v > p2) { b2 = j; p2 = v; } }
      if (b1 !== 0 && b1 !== vorher) { zeichen.push({ z: m.klassen[b1] || '', p: p1, alt: b2 ? m.klassen[b2] || '' : '', p2, pos: i / T }); summe += p1; }
      vorher = b1;
    }
    const text = zeichen.map((z) => z.z).join('');
    return { t: text.trim(), c: zeichen.length ? (summe / zeichen.length) * 100 : 0, zeichen };
  }
  // Ganze Seite: Kästen finden, jeden lesen. Ergebnis wie Tesseract-Wörter: { t, c (0–100), b: {x0,y0,x1,y1}, zeichen }
  async function woerter(leinwand, opt = {}) {
    const m = await lade(opt.melde);
    const k = await finde(leinwand, opt), out = [];
    for (let i = 0; i < k.length; i++) {
      const r = await liesKasten(leinwand, k[i], m);
      if (r && r.t) out.push({ t: r.t, c: r.c, b: { x0: k[i].x0, y0: k[i].y0, x1: k[i].x1, y1: k[i].y1 }, zeichen: r.zeichen, kg: k[i].guete, neig: k[i].neig });
      if (opt.melde && (i % 4 === 0 || i === k.length - 1)) opt.melde({ status: 'recognizing paddle', progress: (i + 1) / k.length });
    }
    return out;
  }
  // Liegt der Text quer? Erkennung auf einer kleinen Fassung: Textzeilen sind breite Kästen; überwiegen hohe, schmale Kästen,
  // steht der Bon um 90° gedreht im Bild.
  async function hochkant(leinwand) {
    const f = Math.min(1, 960 / Math.max(leinwand.width, leinwand.height)), c = document.createElement('canvas');
    c.width = Math.round(leinwand.width * f); c.height = Math.round(leinwand.height * f); c.getContext('2d').drawImage(leinwand, 0, 0, c.width, c.height);
    const k = await finde(c); let breit = 0, hoch = 0;
    for (const q of k) { const w = q.x1 - q.x0, h = q.y1 - q.y0; if (w > 1.6 * h) breit++; else if (h > 1.6 * w) hoch++; }
    return hoch > Math.max(3, breit * 1.5);
  }
  return { lade, verfuegbar, finde, hochkant, woerter, liesKasten: async (c, k) => liesKasten(c, k, await lade()) };
})();
