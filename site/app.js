'use strict';
/* Fasan Karte – Logik. Keine Konten, keine Statistik; Markierungen bleiben auf dem Gerät (localStorage). */
(() => {
  const VERSION = '1.5';
  const STAND_NOTIZEN = '23.10.2026'; // Recherche der Tipps, Preise und Zeiten im Plan
  const datumDe = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
  const TAGE = [
    { id: 'sa', kurz: 'Sa 24.', lang: 'Samstag, 24. Oktober', datum: '2026-10-24' },
    { id: 'so', kurz: 'So 25.', lang: 'Sonntag, 25. Oktober', datum: '2026-10-25' },
    { id: 'mo', kurz: 'Mo 26.', lang: 'Montag, 26. Oktober', datum: '2026-10-26' },
  ];
  const SVG = {
    sehen: '<path d="M3 21h18M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 10l9-6 9 6"/>',
    aussicht: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    essen: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-4 4-4 8h4"/>',
    veggie: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15zM5 19l8-8"/>',
    abends: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    verkehr: '<rect x="6" y="4" width="12" height="13" rx="2.5"/><path d="M6 11h12M9 20l-1.5 2M15 20l1.5 2M9.5 14.5h.01M14.5 14.5h.01"/>',
    plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
    orte: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    herz: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z"/>',
    mehr: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    standort: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
    suche: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    zurueck: '<path d="M15 5l-7 7 7 7"/>',
    haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    aus: '<path d="M3 3l18 18M10.6 5.2A9.9 9.9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    teilen: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    route: '<path d="M3 11.5 21 3l-8.5 18-2-7.5z"/>',
    stern: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/>',
    kopie: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    notiz: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    haus: '<path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5"/>',
    ton: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    tonAus: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
    gruppe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14c2.4.2 4 1.9 4.5 4.5"/>',
    qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM17.5 17.5h3v3h-3zM14 20.5h.01M20.5 14h.01"/>',
    hoch: '<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7"/>',
    foto: '<path d="M3.5 8.5h3.5l1.8-2.5h6.4l1.8 2.5h3.5V19h-17z"/><circle cx="12" cy="13" r="3.5"/>',
    pin: '<path d="M9 3.5h6l-1 5.5 3.5 3.5h-11L10 9zM12 12.5V21"/>',
    runter: '<path d="M7 13V4H4v9zM7 13l4 7c1.5 0 2.5-1 2.2-2.6l-.6-3.4H19a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 17.8 4H7"/>',
  };
  // Symbole je Ortstyp (Farbe = Gruppe, Form = Typ; nie Farbe allein)
  const SYMBOL = {
    restaurant: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-4 4-4 8h4"/>',
    cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3"/>',
    bar: '<path d="M5 4h14l-7 8zM12 12v8M8 20h8"/>',
    fado: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    museum: '<path d="M3 21h18M4 10h16M12 3 3 8h18zM6 10v8M10 10v8M14 10v8M18 10v8"/>',
    kirche: '<path d="M12 2v4M10 4h4M6 21V11l6-4 6 4v10M3 21h18M10 21v-4a2 2 0 0 1 4 0v4"/>',
    aussicht: '<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M4 13l2.5-8h3l1 8M20 13l-2.5-8h-3l-1 8"/>',
    park: '<path d="M12 22v-6M12 3a5 5 0 0 0-5 5 4 4 0 0 0-1 7.5h12A4 4 0 0 0 17 8a5 5 0 0 0-5-5z"/>',
    markt: '<path d="M4 9h16l-1.5-5h-13zM4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 11v9h14v-9M10 20v-5h4v5"/>',
    platz: '<path d="M12 3v6M8.5 6.5C9 4.5 10.5 3.5 12 3c1.5.5 3 1.5 3.5 3.5M4 13h16M6 13v2.5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5V13M3 21h18"/>',
    friedhof: '<path d="M6 21V9a6 6 0 0 1 12 0v12M3 21h18M12 8v6M9.5 10.5h5"/>',
    tram: '<rect x="6" y="5" width="12" height="12" rx="2.5"/><path d="M6 11h12M9 20l-1.5 2M15 20l1.5 2M9 2h6M12 2v3M9.5 14.5h.01M14.5 14.5h.01"/>',
    metro: '<circle cx="12" cy="12" r="9"/><path d="M8 16V8l4 5 4-5v8"/>',
    bahn: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4M9 13.5h.01M15 13.5h.01"/>',
    aufzug: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 9l3-3 3 3M9 15l3 3 3-3"/>',
    faehre: '<path d="M3 18c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M5 15l1.5-5h11L19 15M12 10V4M9 6h6"/>',
    denkmal: '<path d="M10 21V9l2-6 2 6v12M7 21h10M9 13h6"/>',
    turm: '<path d="M7 21V9h10v12M5 9h14M7 9V4h2v2h2V4h2v2h2V4h2v5M10 21v-4h4v4M3 21h18"/>',
    buch: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20V5M8 7h7"/>',
    weg: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6-3-3 1.5-5 3.5 2 2 3M8 12l-2 2M14 15l2 6"/>',
    kueste: '<path d="M3 9c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M3 14c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M3 19c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0"/>',
    treff: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    haus: '<path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5"/>',
    shop: '<path d="M5 8h14l-1 13H6zM9 8V6.5a3 3 0 0 1 6 0V8M9 11.5v.01M15 11.5v.01"/>',
    foto: '<path d="M3.5 8.5h3.5l1.8-2.5h6.4l1.8 2.5h3.5V19h-17z"/><circle cx="12" cy="13" r="3.5"/>',
  };
  const TYP_NAME = { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', fado: 'Fado', museum: 'Museum', kirche: 'Kirche', aussicht: 'Aussicht', park: 'Park', markt: 'Markt',
    platz: 'Platz', friedhof: 'Friedhof', tram: 'Tram', metro: 'Metro', bahn: 'Bahn', aufzug: 'Aufzug, Standseilbahn', faehre: 'Fähre', denkmal: 'Denkmal', turm: 'Turm', buch: 'Bücher, Kultur', weg: 'Spazierweg', kueste: 'Küste', shop: 'Shoppen', haus: 'Unterkunft', foto: 'Foto-Spot' };
  const GRUPPEN = [
    { id: 'sehen', label: 'Sehen', kats: ['Sehenswürdigkeit', 'Museum', 'Markt', 'Event'] },
    { id: 'aussicht', label: 'Aussicht', kats: ['Aussichtspunkt'] },
    { id: 'essen', label: 'Essen', kats: ['Essen für alle', 'Café'] },
    { id: 'veggie', label: 'Veggie', kats: ['Vegan portugiesisch', 'Vegetarisch'] },
    { id: 'abends', label: 'Abends', kats: ['Bar', 'Fado', 'Getränk'] },
    { id: 'verkehr', label: 'Verkehr', kats: ['Verkehr'] },
    { id: 'shoppen', label: 'Shoppen', kats: ['Shoppen'] },
    { id: 'foto', label: 'Foto', kats: ['Foto'] }, // eigene Ebene: nur sichtbar, wenn „Foto“ gewählt ist
  ];
  const THEMES = [
    ['system', 'System', 'Folgt Hell und Dunkel deines Handys.'],
    ['hell', 'Hell', 'Dunkle Schrift auf hellem Grund. Draußen am besten lesbar.'],
    ['dunkel', 'Dunkel', 'Helle Schrift auf dunklem Grund, angenehm am Abend.'],
    ['kontrast', 'Kontrast', 'Größtmöglicher Kontrast (mindestens 7:1), für schlechtes Sehen oder grelles Licht.'],
    ['glas', 'Glas', 'Durchscheinende Flächen; die Bedienung schwebt als Glas über der Karte.'],
  ];
  const PROFILE = [
    ['standard', 'Standard', 'Alle Funktionen.'],
    ['einfach', 'Einfach', 'Größere Schrift und Knöpfe, weniger Auswahl.'],
    ['lesbar', 'Gut lesbar', 'Kontrast 7:1 und die größte Schrift.'],
  ];
  const UA = navigator.userAgent;
  const IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/.test(UA);
  const LISSABON = [38.7139, -9.1394];

  // ---------- Werkzeuge ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  function el(tag, attrs, ...kinder) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kind of kinder.flat(Infinity)) {
      if (kind == null || kind === false) continue;
      e.append(kind.nodeType ? kind : String(kind));
    }
    return e;
  }
  const setze = (box, ...kinder) => box.replaceChildren(...kinder.flat(Infinity).filter((k) => k != null && k !== false));
  const ic = (name, cls) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = SVG[name] || '';
    return s;
  };
  const fasan = (cls) => { const t = $('#tpl-fasan').content.firstElementChild.cloneNode(true); t.classList.add('fasan'); if (cls) t.classList.add(cls); return t; };
  const speicher = {
    get(k, d) { try { const v = localStorage.getItem('fk:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('fk:' + k, JSON.stringify(v)); } catch (e) { /* privater Modus: nur für diese Sitzung */ } },
  };
  const falte = (s) => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const symbolSvg = (o) => SYMBOL[o.typ] || SVG[gruppeVon(o.kategorie)];
  const symbol = (o) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = symbolSvg(o); return s; };
  // Bild des Ortes, sonst eine Kachel mit großem Symbol in der Gruppenfarbe
  const bildKachel = (o, cls) => (o.bild
    ? el('span', { class: 'kachel ' + (cls || '') }, el('img', { src: o.bild.src, alt: '', loading: 'lazy', decoding: 'async' }))
    : el('span', { class: `kachel ohne g-${gruppeVon(o.kategorie)} ${cls || ''}` }, symbol(o)));
  const gruppeVon = (kat) => (GRUPPEN.find((g) => g.kats.includes(kat)) || GRUPPEN[0]).id;
  const hatPos = (o) => o && typeof o.lat === 'number' && typeof o.lon === 'number';
  const istTipp = (o) => /Geheimtipp/.test(o.notiz || '');
  const notizText = (o) => (o.notiz || '').replace(/\s*\(Geheimtipp\)/, '');
  function meter(a, b) {
    const r = Math.PI / 180, p1 = a.lat * r, p2 = b.lat * r;
    const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  const strecke = (m) => (m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 9500 ? 1 : 0).replace('.', ',')} km`);
  const gehzeit = (m) => Math.max(1, Math.round((m * 1.3) / 67)); // Fußweg ≈ 1,3 × Luftlinie, 4 km/h

  // ---------- Einstellungen und Zustand ----------
  const E = Object.assign({ profil: 'standard', theme: 'system', ansage: true, tempo: 'normal', steigung: false }, speicher.get('einstellungen', {}));
  const S = {
    tab: speicher.get('tab', 'plan'), plan: speicher.get('plan', 'A'), tag: speicher.get('tag', 'sa'),
    gruppen: new Set(speicher.get('gruppen', [])), extra: new Set(speicher.get('extra', [])),
    sort: speicher.get('sort', 'naehe'), suche: '', ort: null, hoehe: 'klein',
    me: null, meAlt: null, follow: false, watchId: null, fehlerZeit: 0,
  };
  const heute = new Date();
  const iso = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-${String(heute.getDate()).padStart(2, '0')}`;
  const heuteTag = TAGE.find((t) => t.datum === iso);
  if (heuteTag) S.tag = heuteTag.id;
  if (!['A', 'B', 'C', 'G'].includes(S.plan)) S.plan = 'A';
  if (!['plan', 'orte', 'gruppe', 'gemerkt', 'mehr'].includes(S.tab)) S.tab = 'plan';

  let M = speicher.get('markierungen', {});
  const mk = (id) => M[id] || {};
  function markiere(id, patch) {
    const neu = Object.assign({}, mk(id), patch, { t: Date.now() });
    const leer = !neu.fav && !neu.fertig && !neu.aus && !neu.notiz && !neu.sterne;
    if (leer) delete M[id]; else M[id] = neu;
    speicher.set('markierungen', M);
  }

  let ORTE = [], NACH_NAME = new Map(), NACH_ID = new Map(), PLAENE = {};

  // ---------- Gruppe: Abgleich ohne Server ----------
  // Jedes Handy hält, was es kennt. Ein Paket (Link oder QR) trägt alles davon. Zusammenführen je Person: neuere Fassung gewinnt.
  // Die Daten stehen im Teil hinter „#“; der wird beim Laden der Seite nicht an den Server geschickt (RFC 3986, Abschnitt 3.5).
  let G = Object.assign({ ich: null, leute: {}, umfragen: {}, nachrichten: {} }, speicher.get('gruppe', {}));
  if (!G.nachrichten) G.nachrichten = {};
  const neueId = () => (crypto.getRandomValues ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10) : Math.random().toString(36).slice(2, 12));
  // Live-Abgleich (Funk, siehe funk.js): Zustand nur im Speicher
  const F = { an: false, sig: null, timer: {}, leuteOrt: new Map(), gehoert: new Map(), status: { an: false, verbunden: 0, gesamt: 0 }, ortT: 0, ortP: null, warteZeichnen: false };
  const speichereG = () => { speicher.set('gruppe', G); funkVoll(); };
  const MAX_NACHRICHTEN = 80;
  function ich() {
    if (!G.ich) { G.ich = { id: neueId(), name: '' }; }
    if (!G.leute[G.ich.id]) G.leute[G.ich.id] = { name: G.ich.name, s: {}, a: {}, t: Date.now() };
    return G.leute[G.ich.id];
  }
  const meinName = () => (G.ich && G.ich.name) || 'Ich';
  function stimme(ortId, wert) {
    const me = ich();
    if (wert) me.s[ortId] = wert; else delete me.s[ortId];
    me.t = Date.now(); speichereG();
  }
  const meineStimme = (ortId) => (G.ich && G.leute[G.ich.id] && G.leute[G.ich.id].s[ortId]) || 0;
  function gruppenStimmen(ortId) {
    const ja = [], nein = [];
    for (const [id, p] of Object.entries(G.leute)) {
      const v = p.s && p.s[ortId];
      const n = id === (G.ich && G.ich.id) ? meinName() : p.name || 'Jemand';
      if (v === 1) ja.push(n); else if (v === -1) nein.push(n);
    }
    return { ja, nein };
  }
  function rangliste() {
    return ORTE.map((o) => ({ o, ...gruppenStimmen(o.id) })).filter((x) => x.ja.length || x.nein.length)
      .sort((a, b) => (b.ja.length - b.nein.length) - (a.ja.length - a.nein.length) || b.ja.length - a.ja.length || a.o.name.localeCompare(b.o.name, 'pt'));
  }

  const b64u = {
    enc(bytes) { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); },
  };
  // Gruppenschlüssel für den Live-Abgleich: 32 Zufallsbytes. Treffen zwei Schlüssel aufeinander, gewinnt der ältere,
  // damit alle Handys beim selben Kanal landen. Alte Schlüssel hört das Handy noch eine Weile mit.
  function sichereSchluessel() {
    if (!G.k) { G.k = [b64u.enc(crypto.getRandomValues(new Uint8Array(32))), Date.now()]; speicher.set('gruppe', G); }
    return G.k;
  }
  // Nachrichten: die neuesten MAX_NACHRICHTEN, Reihenfolge fest (Zeit, dann Kennung), damit alle dieselben behalten
  const nachrichtenListe = () => Object.entries(G.nachrichten).sort((a, b) => (b[1].t - a[1].t) || (a[0] < b[0] ? 1 : -1)).slice(0, MAX_NACHRICHTEN);
  async function packe(opt = {}) {
    if (G.ich) { const me = ich(); me.name = G.ich.name; }
    if (G.ich && G.ich.name && window.crypto && crypto.getRandomValues) sichereSchluessel();
    const l = {};
    for (const [id, p] of Object.entries(G.leute)) l[id] = [p.name || '', p.t || 0, p.s || {}, p.a || {}];
    const u = {};
    for (const [id, x] of Object.entries(G.umfragen)) u[id] = [x.von, x.frage, x.o, x.t];
    const tp = G.treff ? [G.treff.name || '', G.treff.lat || 0, G.treff.lon || 0, G.treff.zeit || '', G.treff.von || '', G.treff.t || 0, G.treff.geloescht ? 1 : 0] : null;
    const pn = G.pin ? [G.pin.x || '', G.pin.von || '', G.pin.n || '', G.pin.t || 0, G.pin.weg ? 1 : 0] : null;
    const n = opt.chat ? nachrichtenListe().map(([id, x]) => [id, x.von, x.n, x.x, x.t]) : undefined;
    const roh = new TextEncoder().encode(JSON.stringify({ v: 1, l, u, tp, pn, k: G.k || null, n }));
    if ('CompressionStream' in window) {
      try {
        const z = new Uint8Array(await new Response(new Blob([roh]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
        return 'z' + b64u.enc(z);
      } catch (e) { /* ohne Kompression weiter */ }
    }
    return 'j' + b64u.enc(roh);
  }
  async function entpacke(text) {
    let bytes = b64u.dec(text.slice(1));
    if (text[0] === 'z') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    const d = JSON.parse(new TextDecoder().decode(bytes));
    if (!d || d.v !== 1) throw new Error('Format');
    return d;
  }
  function fuehreZusammen(d) {
    const neu = [];
    for (const [id, p] of Object.entries(d.l || {})) {
      if (G.ich && id === G.ich.id) continue; // eigene Daten bleiben maßgeblich
      if (!Array.isArray(p)) continue;
      const [name, t, s, a] = p;
      const alt = G.leute[id];
      if (!alt || (t || 0) > (alt.t || 0)) {
        G.leute[id] = { name: String(name || '').slice(0, 40), t: +t || 0, s: s && typeof s === 'object' ? s : {}, a: a && typeof a === 'object' ? a : {} };
        neu.push(String(name || 'Jemand').slice(0, 40));
      }
    }
    for (const [id, x] of Object.entries(d.u || {})) {
      if (!G.umfragen[id] && Array.isArray(x)) G.umfragen[id] = { von: x[0], frage: String(x[1] || '').slice(0, 120), o: (x[2] || []).filter((oid) => NACH_ID.has(oid)).slice(0, 8), t: +x[3] || 0 };
    }
    if (Array.isArray(d.tp) && (!G.treff || (+d.tp[5] || 0) > (G.treff.t || 0))) {
      const [name, lat, lon, zeit, von, t, weg] = d.tp;
      G.treff = weg ? { geloescht: true, von, t: +t || 0 } : { name: String(name).slice(0, 80), lat: +lat, lon: +lon, zeit: String(zeit).slice(0, 5), von, t: +t || 0 };
      if (!weg) neu.push('Treffpunkt');
    }
    if (Array.isArray(d.pn) && (+d.pn[3] || 0) > ((G.pin && G.pin.t) || 0)) {
      const [x, von, n, t, weg] = d.pn;
      G.pin = weg ? { weg: 1, von: String(von).slice(0, 12), n: String(n || '').slice(0, 40), t: +t } : { x: String(x || '').slice(0, 300), von: String(von).slice(0, 12), n: String(n || '').slice(0, 40), t: +t };
      neu.pin = !weg;
    }
    neu.nachrichten = [];
    for (const x of Array.isArray(d.n) ? d.n : []) {
      if (!Array.isArray(x) || typeof x[0] !== 'string' || G.nachrichten[x[0]]) continue;
      const [id, von, n, text, t] = x;
      if (!text || !(+t)) continue;
      G.nachrichten[id.slice(0, 16)] = { von: String(von || '').slice(0, 12), n: String(n || '').slice(0, 40), x: String(text).slice(0, 300), t: +t };
      neu.nachrichten.push(G.nachrichten[id.slice(0, 16)]);
    }
    const behalten = new Set(nachrichtenListe().map(([id]) => id));
    for (const id of Object.keys(G.nachrichten)) if (!behalten.has(id)) delete G.nachrichten[id];
    neu.nachrichten = neu.nachrichten.filter((x) => Object.values(G.nachrichten).includes(x));
    if (Array.isArray(d.k) && typeof d.k[0] === 'string' && /^[A-Za-z0-9_-]{43}$/.test(d.k[0]) && +d.k[1] > 0) {
      const [kk, kt] = d.k;
      if (!G.k || +kt < G.k[1] || (+kt === G.k[1] && kk < G.k[0])) {
        if (G.k && G.k[0] !== kk) G.altK = [G.k[0], ...(G.altK || []).filter((x) => x !== kk && x !== G.k[0])].slice(0, 4);
        G.k = [kk, +kt]; neu.schluessel = true;
      }
    }
    speicher.set('gruppe', G); // nicht speichereG: Empfangenes löst kein eigenes Senden aus
    return neu;
  }
  // Hat die Gegenseite etwas nicht, das dieses Handy kennt? Dann antwortet es mit seinem Stand.
  function ihnenFehlt(d) {
    const l = d.l || {};
    for (const [id, p] of Object.entries(G.leute)) { const x = l[id]; if (!Array.isArray(x) || (+x[1] || 0) < (p.t || 0)) return true; }
    const u = d.u || {};
    for (const id of Object.keys(G.umfragen)) if (!u[id]) return true;
    if (G.treff && (!Array.isArray(d.tp) || (+d.tp[5] || 0) < (G.treff.t || 0))) return true;
    if (G.pin && (!Array.isArray(d.pn) || (+d.pn[3] || 0) < (G.pin.t || 0))) return true;
    if (G.k && (!Array.isArray(d.k) || d.k[0] !== G.k[0])) return true;
    if (Array.isArray(d.n)) { const ihre = new Set(d.n.map((x) => x && x[0])); for (const [id] of nachrichtenListe()) if (!ihre.has(id)) return true; }
    return false;
  }
  const paketLink = async () => `${location.origin}${location.pathname}#g=${await packe()}`;
  async function importiereAusHash() {
    const m = /^#g=([zj][A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) return false;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ }
    try {
      const neu = fuehreZusammen(await entpacke(m[1]));
      if (neu.schluessel) funkStart(); else funkVoll(800); // Neues aus dem Link gleich an die anderen weiterreichen
      S.tab = 'gruppe'; speicher.set('tab', 'gruppe'); S.ort = null; hoehe('gross'); zeichne({ anpassen: true });
      toast(neu.length ? `Abgeglichen: ${neu.join(', ')}.` : 'Abgeglichen. Es war nichts Neues dabei.');
    } catch (e) { toast('Dieser Gruppen-Link ist beschädigt. Bitte neu senden lassen.'); }
    return true;
  }
  addEventListener('hashchange', () => { if (/^#g=/.test(location.hash)) importiereAusHash(); });

  // ---------- Live-Abgleich über Nostr (funk.js) ----------
  // Jedes offene Handy sendet seinen Stand bei Änderungen und alle 2 Minuten. Wer etwas Neueres kennt, antwortet.
  // So reicht ein offenes Handy, damit Stimmen, Umfragen, Treffpunkt und Nachrichten weiterwandern.
  const funkErlaubt = () => !!(window.Funk && Funk.moeglich() && E.funk !== false && G.ich && G.ich.name);
  async function funkStart() {
    if (!funkErlaubt()) { funkStopp(); return; }
    const k = sichereSchluessel();
    const liste = [k[0], ...(G.altK || [])];
    const sig = liste.join(',');
    if (F.an && F.sig === sig) return;
    F.sig = sig;
    F.an = await Funk.starte(liste, { empfang: funkEmpfang, status: (s) => { const vorher = F.status.verbunden; F.status = s; if (!!vorher !== !!s.verbunden) funkAnzeige(); } });
    if (F.an) { funkVoll(1500); if (teileOrt() && S.me) funkOrt(S.me, true); }
    funkAnzeige();
  }
  function funkStopp() { if (window.Funk) Funk.stoppe(); F.an = false; F.sig = null; F.status = { an: false, verbunden: 0, gesamt: 0 }; }
  function funkVoll(ms = 1500, schluessel) {
    if (!F.an) return;
    const kanal = schluessel || 'aktuell';
    clearTimeout(F.timer[kanal]);
    F.timer[kanal] = setTimeout(async () => {
      delete F.timer[kanal];
      try { await Funk.sende({ v: 1, a: 'z', von: G.ich && G.ich.id, d: await packe({ chat: true }) }, schluessel); } catch (e) { /* nächster Versuch beim nächsten Anlass */ }
    }, ms);
  }
  const teileOrt = () => !!(E.teilenBis && Date.now() < E.teilenBis);
  function funkOrt(p, sofort) {
    if (!F.an || !G.ich || !p) return;
    const jetzt = Date.now();
    if (!sofort && jetzt - F.ortT < 15000) return;
    if (!sofort && F.ortP && meter(F.ortP, p) < 25 && jetzt - F.ortT < 60000) return;
    F.ortT = jetzt; F.ortP = p;
    Funk.sende({ v: 1, a: 'o', id: G.ich.id, n: meinName(), lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5), acc: Math.round(p.acc || 0), ts: jetzt }).catch(() => {});
  }
  function teilenEnde(stumm) {
    E.teilenBis = 0; speichereE();
    if (F.an && G.ich) Funk.sende({ v: 1, a: 'o', id: G.ich.id, aus: 1, ts: Date.now() }).catch(() => {});
    if (!stumm) toast('Du teilst deinen Standort nicht mehr.');
  }
  async function funkEmpfang(m, schluessel) {
    if (!m || m.v !== 1) return;
    if (typeof m.von === 'string' || typeof m.id === 'string') F.gehoert.set(m.von || m.id, Date.now());
    if (m.a === 'z' && typeof m.d === 'string') {
      let d; try { d = await entpacke(m.d); } catch (e) { return; }
      const neu = fuehreZusammen(d);
      const alt = G.k && schluessel !== G.k[0];
      if (alt || ihnenFehlt(d)) funkVoll(800 + Math.random() * 2500, alt ? schluessel : undefined);
      else if (F.timer.aktuell && !neu.length && !neu.nachrichten.length) { /* andere haben schon denselben Stand gesendet */ clearTimeout(F.timer.aktuell); delete F.timer.aktuell; }
      if (neu.schluessel) funkStart();
      const fremde = neu.nachrichten.filter((x) => !G.ich || x.von !== G.ich.id);
      if (fremde.length) {
        const x = fremde[fremde.length - 1];
        if (!(S.tab === 'gruppe' && !S.ort && document.visibilityState === 'visible')) {
          toast(`${x.n || 'Jemand'}: ${x.x}`, { aktion: 'Öffnen', fn: () => { S.tab = 'gruppe'; S.ort = null; hoehe('gross'); zeichne(); } });
          try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* egal */ }
        }
      } else if (neu.pin) toast(`Angepinnt von ${G.pin.n || 'jemandem'}: ${G.pin.x}`);
      if (neu.length || neu.nachrichten.length || neu.pin !== undefined) neuZeichnen();
      leisteZahl();
      return;
    }
    if (m.a === 'o' && typeof m.id === 'string' && (!G.ich || m.id !== G.ich.id)) {
      if (m.aus) { F.leuteOrt.delete(m.id); zeichneLeute(); return; }
      const lat = +m.lat, lon = +m.lon, ts = +m.ts;
      if (!(lat > -90 && lat < 90 && lon > -180 && lon < 180) || !(ts > Date.now() - 3 * 3600e3 && ts < Date.now() + 300e3)) return;
      const alt = F.leuteOrt.get(m.id);
      if (alt && alt.ts >= ts) return;
      F.leuteOrt.set(m.id, { n: String(m.n || 'Jemand').slice(0, 40), lat, lon, acc: Math.min(+m.acc || 0, 2000), ts });
      zeichneLeute();
      if (S.tab === 'gruppe' && !S.ort) neuZeichnen();
    }
  }
  // Nicht mitten ins Tippen hinein neu zeichnen
  function neuZeichnen() {
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $('#blatt').contains(a)) { F.warteZeichnen = true; return; }
    if (!S.ort) zeichne({ scroll: true, karte: S.tab === 'plan' && S.plan === 'G' });
  }
  document.addEventListener('focusout', () => { if (F.warteZeichnen) setTimeout(() => { if (F.warteZeichnen) { F.warteZeichnen = false; neuZeichnen(); } }, 300); });
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (teileOrt() && S.me) funkOrt(S.me); else if (E.teilenBis && !teileOrt()) teilenEnde(false);
    for (const [id, x] of F.leuteOrt) if (Date.now() - x.ts > 3 * 3600e3) F.leuteOrt.delete(id);
  }, 20000);
  setInterval(() => { if (document.visibilityState === 'visible' && F.an) funkVoll(Math.random() * 3000); }, 120000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!F.an) funkStart(); else { Funk.pruefe(); funkVoll(1000); }
  });

  function nachrichtSenden(text) {
    const x = String(text || '').trim().slice(0, 300);
    if (!x) return false;
    const me = ich();
    const id = neueId() + Date.now().toString(36).slice(-4);
    G.nachrichten[id] = { von: G.ich.id, n: meinName(), x, t: Date.now() };
    me.t = Date.now();
    speichereG();
    return true;
  }
  function anpinnen(text) {
    G.pin = text ? { x: String(text).slice(0, 300), von: G.ich.id, n: meinName(), t: Date.now() } : { weg: 1, von: G.ich.id, n: meinName(), t: Date.now() };
    ich().t = Date.now(); speichereG();
  }
  const ungelesen = () => Object.values(G.nachrichten).filter((x) => (!G.ich || x.von !== G.ich.id) && x.t > speicher.get('gelesen', 0)).length;
  function leisteZahl() {
    const b = $('#leiste [data-tab="gruppe"] .pille');
    if (!b) return;
    let z = b.querySelector('.zahl');
    const n = ungelesen();
    if (!n) { if (z) z.remove(); return; }
    if (!z) { z = el('span', { class: 'zahl', 'aria-hidden': 'true' }); b.append(z); }
    z.textContent = n > 9 ? '9+' : String(n);
    $('#leiste [data-tab="gruppe"]').setAttribute('aria-label', `Gruppe, ${n} neue ${n === 1 ? 'Nachricht' : 'Nachrichten'}`);
  }

  async function teileGruppe() {
    if (!G.ich || !G.ich.name) { toast('Gib zuerst deinen Namen ein.'); return; }
    const url = await paketLink();
    const text = `${meinName()} lädt dich in unsere Lissabon-Gruppe ein. Antippen zum Beitreten:`;
    if (navigator.share) navigator.share({ title: 'Fasan Karte · Gruppe', text, url }).catch(() => {});
    else kopiere(`${text} ${url}`, 'Link kopiert. Jetzt in WhatsApp einfügen.');
  }
  async function zeigeQr() {
    if (!G.ich || !G.ich.name) { toast('Gib zuerst deinen Namen ein.'); return; }
    const url = await paketLink();
    const box = $('#qr');
    let inhalt;
    try {
      if (!window.qrcode) throw new Error('fehlt');
      const qr = window.qrcode(0, 'L');
      qr.addData(url); qr.make();
      const n = qr.getModuleCount(), rand = 4, groesse = Math.min(innerWidth - 48, innerHeight - 260, 420);
      const zelle = Math.max(1, Math.floor(groesse / (n + rand * 2)));
      const cv = el('canvas', { width: (n + rand * 2) * zelle, height: (n + rand * 2) * zelle, 'aria-label': 'QR-Code mit deinen Gruppen-Daten', role: 'img' });
      const c = cv.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect((k + rand) * zelle, (r + rand) * zelle, zelle, zelle);
      inhalt = cv;
    } catch (e) {
      inhalt = el('p', { style: 'max-width:320px;text-align:center' }, e.message === 'fehlt' ? 'Der QR-Code lädt nicht. Schick den Link per WhatsApp.' : 'Zu viele Daten für einen QR-Code. Schick den Link per WhatsApp.');
    }
    setze(box, el('div', { class: 'qr-karte', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'QR-Code zeigen' },
      el('strong', { style: 'font-size:var(--fs-t)' }, `${meinName()} · Gruppe`),
      inhalt,
      el('p', { style: 'margin:0;text-align:center' }, 'Die anderen öffnen ihre Handy-Kamera und richten sie auf den Code. Dann den Link antippen.'),
      el('p', { class: 'klein', style: 'margin:0;text-align:center;opacity:.75' }, 'Tipp: Bildschirm heller stellen.'),
      el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => { box.hidden = true; } }, 'Fertig')));
    box.hidden = false;
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* egal */ }
  }

  // ---------- Aussehen ----------
  const dunkelMq = matchMedia('(prefers-color-scheme: dark)');
  function wendeAn() {
    const r = document.documentElement;
    let t = E.theme === 'system' ? (dunkelMq.matches ? 'dunkel' : 'hell') : E.theme;
    if (E.profil === 'lesbar' && E.theme === 'system') t = 'kontrast';
    r.dataset.theme = t;
    r.dataset.profil = E.profil;
    const mc = { hell: '#F6F5F1', dunkel: '#111211', kontrast: '#000000', glas: '#0E1218' }[t];
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', mc));
  }
  dunkelMq.addEventListener('change', () => { if (E.theme === 'system') wendeAn(); });
  const speichereE = () => speicher.set('einstellungen', E);

  // Alles läuft in der App: keine Übergabe an Google Maps oder Apple Karten (Wunsch des Nutzers, 24.10.2026)
  function zielText(o) {
    if (/[()]|\sund\s|^Tram |^Fähre /.test(o.name) || o.adresse.startsWith(o.name)) return o.adresse;
    return `${o.name}, ${o.adresse}`;
  }

  // ---------- Daten ----------
  function schritte(plan = S.plan, tag = S.tag) {
    if (plan === 'G') return ORTE.length ? gruppenplan()[tag] || [] : [];
    let s = PLAENE[plan] && PLAENE[plan].tage && PLAENE[plan].tage[tag];
    if (typeof s === 'string') s = PLAENE[s] && PLAENE[s].tage && PLAENE[s].tage[tag];
    return Array.isArray(s) ? s : [];
  }
  function planStopps() {
    return schritte().filter((s) => s.ort && NACH_NAME.has(s.ort)).map((s, i) => ({ s, o: NACH_NAME.get(s.ort), nr: i + 1 }));
  }
  function inPlaenen(o) {
    const out = [];
    for (const p of ['A', 'B', 'C']) for (const t of TAGE) {
      const st = schritte(p, t.id).filter((s) => s.ort);
      const i = st.findIndex((s) => s.ort === o.name || (s.alt || []).includes(o.name));
      if (i >= 0 && !(typeof (PLAENE[p].tage || {})[t.id] === 'string')) out.push(`Plan ${p} · ${t.kurz} · Stopp ${i + 1}`);
    }
    return out;
  }
  function status(o) {
    const z = o.infos && o.infos.oeffnungszeiten;
    return z ? window.Oeffnung.status(z) : null;
  }
  function gefiltert() {
    const q = falte(S.suche.trim());
    return ORTE.filter((o) => {
      const m = mk(o.id);
      if (m.aus && !S.extra.has('aus')) return false;
      if (q && !falte(`${o.name} ${o.kategorie} ${o.notiz} ${o.adresse} ${m.notiz || ''}`).includes(q)) return false;
      if (q) return true; // Suche schlägt Filter
      const gr = gruppeVon(o.kategorie);
      if (gr === 'foto' && !S.gruppen.has('foto')) return false; // Foto-Spots nur auf Wunsch
      if (S.gruppen.size && !S.gruppen.has(gr) && !(S.gruppen.has('foto') && o.foto)) return false;
      if (S.extra.has('tipp') && !istTipp(o)) return false;
      if (S.extra.has('fav') && !m.fav) return false;
      if (S.extra.has('offen')) { const st = status(o); if (!st || !st.offen) return false; }
      if (S.extra.has('offenNicht') && m.fertig) return false;
      if (S.extra.has('gruppe') && !gruppenStimmen(o.id).ja.length) return false;
      return true;
    });
  }
  function sortiert(liste) {
    const r = GRUPPEN.map((g) => g.id);
    if (S.sort === 'naehe' && S.me) return liste.slice().sort((a, b) => (hatPos(a) ? meter(S.me, a) : 1e9) - (hatPos(b) ? meter(S.me, b) : 1e9));
    return liste.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }

  // ---------- Karte ----------
  let karte = null, ebene = null, leuteEbene = null, ichPunkt = null, ichKreis = null;
  const marker = new Map();
  if (window.L) {
    karte = L.map('karte', { zoomControl: false, attributionControl: true }).setView(LISSABON, 14);
    karte.attributionControl.setPosition('topright').setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(karte);
    ebene = L.layerGroup().addTo(karte);
    leuteEbene = L.layerGroup().addTo(karte);
    karte.on('dragstart', () => { if (S.follow) { S.follow = false; gpsKnopf(); } });
    karte.on('zoomend', () => namenZoom());
    karte.on('click', () => { if (S.ort) schliesseOrt(); else if (S.hoehe !== 'klein') hoehe('klein'); });
  }

  // Mitreisende mit geteiltem Standort: Kreis mit Initialen, Name daneben; nach 10 Minuten blass
  function zeichneLeute() {
    if (!leuteEbene) return;
    leuteEbene.clearLayers();
    for (const [, x] of F.leuteOrt) {
      const alt = Date.now() - x.ts > 600000;
      L.marker([x.lat, x.lon], { icon: L.divIcon({ className: 'punkt person-punkt' + (alt ? ' alt' : ''), html: `<span class="p">${initialen(x.n).replace(/[<>&"]/g, '')}</span>`, iconSize: [44, 44], iconAnchor: [22, 22] }), title: x.n, zIndexOffset: 800, keyboard: false })
        .bindTooltip(`${x.n.replace(/[<>&"]/g, '')} · ${zeitHer(x.ts)}`, { permanent: true, direction: 'right', offset: [14, 0], className: 'name-label person-label', interactive: false })
        .addTo(leuteEbene);
    }
  }
  setInterval(() => { if (F.leuteOrt.size && document.visibilityState === 'visible') zeichneLeute(); }, 60000);

  function punktIcon(o, nr, opt = {}) {
    const m = mk(o.id), g = gruppeVon(o.kategorie);
    const kl = ['punkt', 'g-' + g, nr ? 'nr' : '', m.fertig ? 'erledigt' : '', S.ort === o.id ? 'gewaehlt' : '', opt.naechster ? 'naechster' : ''].filter(Boolean).join(' ');
    const innen = `<svg viewBox="0 0 24 24">${symbolSvg(o)}</svg>` + (nr ? `<span class="nummer">${nr}</span>` : '');
    const marke = m.fav ? `<span class="marke herz"><svg viewBox="0 0 24 24">${SVG.herz}</svg></span>`
      : istTipp(o) ? `<span class="marke tipp"><svg viewBox="0 0 24 24">${SVG.stern}</svg></span>` : '';
    return L.divIcon({ className: kl + (opt.alt ? ' alt' : ''), html: `<span class="p">${innen}</span>${marke}`, iconSize: [60, 60], iconAnchor: [30, 30] });
  }

  function karteZeichnen(anpassen) {
    if (!karte) return;
    ebene.clearLayers(); marker.clear();
    let orte = [], nummern = new Map(), linie = [];
    let naechsterId = null;
    if (N.aktiv && N.ziel) {
      if (N.ziel.id !== 'treff') { orte.push(N.ziel); naechsterId = N.ziel.id; }
    } else if (S.tab === 'plan') {
      const nx = planStopps().find(({ o }) => !mk(o.id).fertig);
      naechsterId = nx ? nx.o.id : null;
      for (const { o, nr, s } of planStopps()) {
        orte.push(o); nummern.set(o.id, nr);
        if (hatPos(o)) linie.push([o.lat, o.lon]);
        (s.alt || []).map((n) => NACH_NAME.get(n)).filter(Boolean).forEach((a) => { if (!orte.includes(a)) orte.push(a); });
      }
    } else if (S.tab === 'gruppe') {
      rangliste().forEach(({ o }, i) => { orte.push(o); nummern.set(o.id, i + 1); });
      for (const u of Object.values(G.umfragen)) u.o.map((id) => NACH_ID.get(id)).filter(Boolean).forEach((o) => { if (!orte.includes(o)) orte.push(o); });
    } else if (S.tab === 'gemerkt') {
      orte = ORTE.filter((o) => { const m = mk(o.id); return !m.aus && (m.fav || m.notiz || m.sterne || m.fertig); });
    } else {
      orte = gefiltert();
    }
    if (S.ort && !orte.some((o) => o.id === S.ort)) orte.push(NACH_ID.get(S.ort));
    if (linie.length > 1) L.polyline(linie, { className: 'route', color: '#9A4A1C', weight: 4, opacity: 0.85, dashArray: '1 10', lineCap: 'round', interactive: false }).addTo(ebene);
    const punkte = [];
    for (const o of orte) {
      if (!hatPos(o)) continue;
      const nr = nummern.get(o.id);
      const mm = L.marker([o.lat, o.lon], { icon: punktIcon(o, nr, { naechster: o.id === naechsterId }), title: o.name, alt: o.name, keyboard: true, riseOnHover: true, zIndexOffset: o.id === naechsterId ? 800 : nr ? 400 : 0 })
        .on('click', (e) => { L.DomEvent.stopPropagation(e); oeffneOrt(o.id); })
        .bindTooltip(o.name, { permanent: true, direction: 'right', offset: [18, 0], className: 'name-label', interactive: false })
        .addTo(ebene);
      marker.set(o.id, mm);
      punkte.push([o.lat, o.lon]);
    }
    const tp = treffOrt();
    if (tp) L.marker([tp.lat, tp.lon], { icon: L.divIcon({ className: 'punkt treffpunkt', html: `<span class="p"><svg viewBox="0 0 24 24">${SYMBOL.treff}</svg></span>`, iconSize: [60, 60], iconAnchor: [30, 30] }), title: tp.name, zIndexOffset: 900 })
      .bindTooltip(`${G.treff.zeit} · ${G.treff.name}`, { permanent: true, direction: 'right', offset: [18, 0], className: 'name-label treff-label', interactive: false })
      .on('click', (e) => { L.DomEvent.stopPropagation(e); starteNavi(tp, true); }).addTo(ebene);
    if (anpassen && punkte.length && !S.follow && !S.ort) passeAn(punkte);
    namenZoom();
  }
  // Namen an den Punkten erst ab näherem Zoom, sonst wird es unübersichtlich
  function namenZoom() { if (karte) karte.getContainer().classList.toggle('namen', karte.getZoom() >= (S.tab === 'plan' || N.aktiv ? 15 : 16)); }

  function blattPx() { return $('#blatt').getBoundingClientRect().height; }
  function passeAn(punkte) {
    // Eigener Standort bleibt sichtbar, wenn er in der Nähe ist (sonst verschwindet beim Planwechsel der blaue Punkt)
    if (S.me && punkte.length && meter(S.me, { lat: punkte[0][0], lon: punkte[0][1] }) < 15000) punkte = punkte.concat([[S.me.lat, S.me.lon]]);
    const unten = blattPx() + $('#leiste').offsetHeight + 12;
    if (punkte.length === 1) { zeigeAufKarte({ lat: punkte[0][0], lon: punkte[0][1] }, 16); return; }
    karte.fitBounds(punkte, { paddingTopLeft: [28, 48], paddingBottomRight: [28 + (innerWidth >= 760 ? 440 : 0), unten], maxZoom: 16, animate: true });
  }
  function zeigeAufKarte(o, zoom) {
    if (!karte || !hatPos(o)) return;
    const z = zoom || Math.max(karte.getZoom(), 16);
    const versatz = innerWidth >= 760 ? [-220, 0] : [0, (blattPx() + $('#leiste').offsetHeight - 48) / 2];
    const p = karte.project([o.lat, o.lon], z).add(versatz);
    karte.setView(karte.unproject(p, z), z, { animate: true });
  }

  // ---------- Blatt ----------
  function hoehe(h) {
    S.hoehe = h;
    const vh = innerHeight, nav = $('#leiste').offsetHeight;
    const gross = E.profil === 'standard' ? 0 : 36;
    const px = innerWidth >= 760
      ? { klein: 300 + gross, mitte: Math.round(vh * 0.55), gross: vh - nav - 48 }[h]
      : { klein: 300 + gross, mitte: Math.round(vh * 0.55), gross: vh - nav - 56 - (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0) }[h];
    document.documentElement.style.setProperty('--blatt-h', `${px}px`);
    document.body.dataset.blatt = h;
    if (h === 'klein') passeKleinAn();
    $('#griff').setAttribute('aria-label', h === 'gross' ? 'Blatt verkleinern' : 'Blatt vergrößern');
  }
  // Im kleinen Zustand soll der wichtigste Knopf ganz zu sehen sein (Google-Maps-Muster: Vorschau mit Aktion)
  function passeKleinAn() {
    if (S.hoehe !== 'klein' || innerWidth >= 760) return;
    requestAnimationFrame(() => {
      const ziel = $('#ansicht .zusammen .knopf.haupt') || $('#ansicht .zusammen') || $('#ansicht').firstElementChild;
      if (!ziel) return;
      const kopf = $('#ansicht').getBoundingClientRect().top - $('#blatt').getBoundingClientRect().top;
      const unten = ziel.getBoundingClientRect().bottom - $('#ansicht').getBoundingClientRect().top + $('#ansicht').scrollTop;
      const px = Math.min(Math.round(innerHeight * 0.5), Math.max(200, Math.round(kopf + unten + 14)));
      document.documentElement.style.setProperty('--blatt-h', `${px}px`);
    });
  }
  const STUFEN = ['klein', 'mitte', 'gross'];
  const groesser = () => hoehe(STUFEN[Math.min(2, STUFEN.indexOf(S.hoehe) + 1)]);
  const kleiner = () => hoehe(STUFEN[Math.max(0, STUFEN.indexOf(S.hoehe) - 1)]);

  // ---------- Ansichten ----------
  function zeichne(opt = {}) {
    $$('#leiste [data-tab]').forEach((b) => { if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const box = $('#ansicht');
    const scroll = opt.scroll ? box.scrollTop : 0;
    $('.blatt-kopf').hidden = !!S.ort;
    if (S.ort) zeichneOrt(box);
    else if (S.tab === 'plan') zeichnePlan(box);
    else if (S.tab === 'orte') zeichneOrte(box);
    else if (S.tab === 'gemerkt') zeichneGemerkt(box);
    else if (S.tab === 'gruppe') zeichneGruppe(box);
    else zeichneMehr(box);
    box.scrollTop = scroll;
    passeKleinAn();
    if (opt.karte !== false) karteZeichnen(opt.anpassen);
  }

  function eintragOrt(o, opt = {}) {
    const m = mk(o.id), g = gruppeVon(o.kategorie), st = status(o);
    const unter = [o.kategorie];
    if (o.ort && o.ort !== 'Lisboa') unter.push(o.ort);
    if (S.me && hatPos(o)) { const d = meter(S.me, o); unter.push(`${strecke(d)} · ${gehzeit(d)} Min.`); }
    if (o.dauer) unter.push(`vor Ort ${o.dauer} Min.`);
    const gs = gruppenStimmen(o.id);
    if (gs.ja.length || gs.nein.length) unter.push(`👍 ${gs.ja.length}${gs.nein.length ? ` 👎 ${gs.nein.length}` : ''}`);
    const offen = st ? el('span', { class: 'status ' + (st.offen ? 'offen' : 'zu') }, st.offen ? `offen bis ${st.bis}` : st.naechste ? `zu, öffnet ${st.naechste}` : 'geschlossen') : null;
    const zeichen = el('span', { class: 'zeichen' },
      m.fav ? ic('herz') : null, istTipp(o) ? ic('stern') : null, m.notiz ? ic('notiz') : null);
    zeichen.querySelectorAll('svg').forEach((s, i) => { s.style.fill = 'none'; s.style.stroke = 'currentColor'; s.style.strokeWidth = '2'; });
    const marker = el('span', { class: 'marker g-' + g }, symbol(o), opt.nr ? el('span', { class: 'nummer' }, String(opt.nr)) : null);
    const li = el('li', { class: 'eintrag' + (m.fertig ? ' erledigt' : '') },
      el('button', { type: 'button', class: 'auf', onclick: () => oeffneOrt(o.id, true) },
        marker,
        el('span', { class: 'text' },
          el('span', { class: 'titel' }, opt.zeit ? el('span', { class: 'zeit' }, opt.zeit + ' ') : null, o.name, zeichen),
          opt.text ? el('span', { class: 'unter', style: 'color:var(--text);font-weight:600' }, opt.text) : null,
          el('span', { class: 'unter' }, unter.join(' · '), offen ? ' · ' : '', offen)),
        opt.ohneBild ? null : bildKachel(o)),
      opt.haken ? el('button', {
        type: 'button', class: 'haken', 'aria-pressed': String(!!m.fertig), 'aria-label': `${o.name} als erledigt markieren`,
        onclick: () => schalteErledigt(o),
      }, ic('haken')) : null);
    return li;
  }

  function schalteErledigt(o) {
    const vorher = !!mk(o.id).fertig;
    markiere(o.id, { fertig: !vorher });
    zeichne({ scroll: true });
    const n = !vorher && S.tab === 'plan' ? planStopps().find(({ o: x }) => !mk(x.id).fertig) : null;
    toast(!vorher ? (n ? `Erledigt. Weiter zu: ${n.o.name}` : 'Erledigt.') : 'Wieder offen.', {
      aktion: 'Rückgängig', fn: () => { markiere(o.id, { fertig: vorher }); zeichne({ scroll: true }); },
    });
  }

  // ---------- Wetter: wetter.json entsteht im Bauprozess (tools/wetter.py), die Handys fragen keinen Wetterdienst ----------
  let W = null;
  // WMO-Wettercodes laut Open-Meteo-Doku (open-meteo-website, wmo-codes-table.svelte, abgerufen 24.10.2026)
  const WMO = (c) => (c === 0 ? ['☀️', 'Klar'] : c === 1 ? ['🌤️', 'Überwiegend klar'] : c === 2 ? ['⛅', 'Teils bewölkt'] : c === 3 ? ['☁️', 'Bedeckt']
    : c === 45 || c === 48 ? ['🌫️', 'Nebel'] : c >= 51 && c <= 57 ? ['🌦️', 'Niesel'] : c >= 61 && c <= 67 ? ['🌧️', 'Regen']
      : (c >= 71 && c <= 77) || c === 85 || c === 86 ? ['🌨️', 'Schnee'] : c >= 80 && c <= 82 ? ['🌦️', 'Schauer'] : c >= 95 ? ['⛈️', 'Gewitter'] : ['', '']);
  const zeitpunkt = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || ''); return m ? `${m[3]}.${m[2]}. ${m[4]}:${m[5]}` : ''; };
  function wetterTeil(tagId) {
    if (!W) return null;
    const tag = TAGE.find((t) => t.id === tagId);
    const ip = W.ipma && (W.ipma.tage || []).find((x) => x.datum === tag.datum);
    const std = ((W.om && W.om.stunden) || []).filter((x) => x.t.startsWith(tag.datum) && +x.t.slice(11, 13) >= 8 && +x.t.slice(11, 13) <= 22);
    const sonne = ((W.om && W.om.sonne) || []).find((x) => x.datum === tag.datum);
    if (!ip && !std.length) return null;
    const jetztH = tag.datum === iso ? new Date().getHours() : 0;
    const regenAb = std.find((x) => x.regen >= 60 && +x.t.slice(11, 13) >= jetztH);
    const mittag = std.filter((x) => +x.t.slice(11, 13) >= 10 && +x.t.slice(11, 13) <= 18).map((x) => x.code);
    const haeufig = mittag.sort((a, b) => mittag.filter((v) => v === b).length - mittag.filter((v) => v === a).length)[0];
    const [emo] = WMO(haeufig != null ? haeufig : -1);
    const alt = W.stand && Date.now() - Date.parse(W.stand) > 6 * 3600e3;
    const kopf = [ip ? `${Math.round(ip.min)}–${Math.round(ip.max)} °C` : null, ip ? `Regen ${ip.regen} %` : null, ip && ip.text ? ip.text : null].filter(Boolean).join(' · ');
    return el('section', { class: 'wetter' + (alt ? ' alt' : ''), 'aria-label': `Wetter ${tag.lang}` },
      el('div', { class: 'w-kopf' }, emo ? el('span', { class: 'w-emo', 'aria-hidden': 'true' }, emo) : null,
        el('div', {}, el('strong', {}, kopf || 'Wetter'), sonne ? el('small', {}, `Sonnenaufgang ${sonne.auf} · Sonnenuntergang ${sonne.unter}`) : null)),
      std.length ? el('ol', { class: 'w-stunden', 'aria-label': 'Stündlich' }, std.filter((x, i) => i % 2 === 0).map((x) => {
        const [e, txt] = WMO(x.code);
        return el('li', { 'aria-label': `${x.t.slice(11, 13)} Uhr: ${txt}, ${Math.round(x.temp)} Grad, Regen ${x.regen} Prozent` },
          el('small', {}, x.t.slice(11, 13)), el('span', { 'aria-hidden': 'true' }, e), el('b', {}, `${Math.round(x.temp)}°`), el('small', { class: x.regen >= 50 ? 'nass' : '' }, x.regen >= 20 ? `${x.regen} %` : ' '));
      })) : null,
      regenAb ? el('p', { class: 'hilfe', style: 'margin:0' }, el('span', {}, `Regen wahrscheinlich ab ${+regenAb.t.slice(11, 13)} Uhr (${regenAb.regen} %). Für drinnen: Museen, Markthallen, Shoppen.`)) : null,
      tagId === 'sa' ? el('p', { class: 'klein', style: 'margin:0' }, 'Heute Nacht endet die Sommerzeit: Um 2 Uhr springen die Uhren auf 1 Uhr zurück. Handys stellen sich selbst um. Ab Sonntag wird es eine Stunde früher dunkel (EU-Richtlinie 2000/84/EG).') : null,
      el('p', { class: 'leise klein', style: 'margin:0' }, alt ? el('b', {}, 'Veraltet. ') : null,
        [ip ? `Tag: IPMA${W.ipma.aktualisiert ? `, Stand ${zeitpunkt(W.ipma.aktualisiert)}` : ''}` : null, std.length ? `Stunden: Open-Meteo (CC BY 4.0)` : null].filter(Boolean).join(' · '),
        W.stand ? ` · abgerufen ${uhrzeit(Date.parse(W.stand))}` : ''));
  }

  function zeichnePlan(box) {
    const plan = S.plan === 'G' ? { titel: 'Gruppenplan', untertitel: '' } : PLAENE[S.plan] || { titel: 'Plan ' + S.plan, untertitel: '' };
    const tag = TAGE.find((t) => t.id === S.tag);
    const stopps = planStopps();
    const fertig = stopps.filter(({ o }) => mk(o.id).fertig).length;
    const naechster = stopps.find(({ o }) => !mk(o.id).fertig);

    let zusammen;
    if (naechster) {
      const { o, s, nr } = naechster;
      const d = S.me && hatPos(o) ? meter(S.me, o) : null;
      zusammen = el('div', { class: 'zusammen' },
        el('button', { type: 'button', class: 'naechst-karte g-' + gruppeVon(o.kategorie), onclick: () => oeffneOrt(o.id, true), 'aria-label': `Nächster Stopp: ${o.name}. Details öffnen` },
          bildKachel(o, 'gross'),
          el('span', { class: 'naechst-text' },
            el('small', {}, `Nächster Stopp ${nr} von ${stopps.length}${s.zeit ? ` · ${s.zeit} Uhr` : ''}`),
            el('strong', {}, o.name),
            el('span', { class: 'naechst-art' }, el('span', { class: 'marker g-' + gruppeVon(o.kategorie) }, symbol(o)), TYP_NAME[o.typ] || o.kategorie,
              d != null ? ` · ${gehzeit(d)} Min. zu Fuß` : ''))),
        el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => starteNavi(o) }, ic('route'), 'Hinführen'),
        hilfe('hinfuehren', '„Hinführen“ zeigt den Fußweg auf der Karte und sagt jede Abbiegung an. Am Ziel hakst du den Stopp ab.'));
    } else if (S.plan === 'G' && !stopps.length) {
      zusammen = el('div', { class: 'leer' }, fasan(), el('strong', {}, 'Der Gruppenplan entsteht aus euren Stimmen.'),
        el('span', {}, 'Stimmt bei Orten mit „Will hin“ ab. Unter „Gruppe“ gleicht sich das ab. Dann baut die App die Tage: passende Orte nach Nähe, Öffnungstagen und mit Essen.'),
        el('button', { type: 'button', class: 'knopf', onclick: () => { S.tab = 'gruppe'; hoehe('gross'); zeichne(); } }, ic('gruppe'), 'Zur Gruppe'));
    } else {
      zusammen = el('div', { class: 'leer' }, fasan(), el('strong', {}, stopps.length ? 'Alles erledigt für heute.' : 'Für diesen Tag gibt es keine Stopps.'));
    }

    const tageSeg = el('div', { class: 'segmente', role: 'group', 'aria-label': 'Tag' },
      TAGE.map((t) => el('button', { type: 'button', 'aria-pressed': String(t.id === S.tag), onclick: () => { S.tag = t.id; speicher.set('tag', S.tag); zeichne({ anpassen: true }); } }, t.kurz)));
    const planSeg = el('div', { class: 'segmente nur-voll', role: 'group', 'aria-label': 'Plan' },
      ['A', 'B', 'C', 'G'].map((p) => el('button', { type: 'button', 'aria-pressed': String(p === S.plan), onclick: () => { S.plan = p; speicher.set('plan', p); zeichne({ anpassen: true }); } }, p === 'G' ? 'Gruppe' : 'Plan ' + p)));

    const liste = el('ol', { class: 'liste' });
    let nr = 0;
    for (const s of schritte()) {
      if (s.hinweis) { liste.append(el('li', { class: 'hinweis' }, el('span', { class: 'pfeil' }, '↓'), s.hinweis)); continue; }
      const o = NACH_NAME.get(s.ort);
      if (!o) continue;
      nr += 1;
      liste.append(eintragOrt(o, { nr, zeit: s.zeit, text: s.text, haken: true }));
      for (const a of (s.alt || []).map((n) => NACH_NAME.get(n)).filter(Boolean)) {
        const alt = eintragOrt(a, { text: 'Oder hier' });
        alt.style.paddingLeft = '28px';
        liste.append(alt);
      }
    }
    setze(box,
      pinKarte(),
      treffKarte(),
      zusammen,
      el('div', { class: 'abschnitt', style: 'display:grid;gap:8px' }, tageSeg, planSeg),
      wetterTeil(S.tag),
      el('p', { class: 'leise klein', style: 'margin:12px 0 0' }, S.plan === 'G' ? `Gruppenplan aus ${Object.keys(G.leute).length} ${Object.keys(G.leute).length === 1 ? 'Person' : 'Personen'}: passt sich bei jedem Abgleich an. Zeiten sind geschätzt. ${tag.lang}.` : `${plan.titel}: ${plan.untertitel}. ${tag.lang}.`),
      stopps.length ? el('div', { class: 'fortschritt', style: 'margin-top:10px', 'aria-label': `${fertig} von ${stopps.length} erledigt` }, el('span', { style: `width:${(fertig / stopps.length) * 100}%` })) : null,
      stopps.length ? el('p', { class: 'leise klein', style: 'margin:10px 0 0' }, 'Die App führt euch Stopp für Stopp. Am Ziel geht es mit einem Tipp zum nächsten.') : null,
      el('div', { class: 'reihe', style: 'margin-top:12px' }, heimKnopf()),
      liste);
  }

  const heimOrt = () => (E.heimPos ? { id: 'heim', name: 'Unterkunft', kategorie: 'Verkehr', typ: 'haus', adresse: '', notiz: '', lat: E.heimPos.lat, lon: E.heimPos.lon } : null);
  function heimKnopf() {
    const h = heimOrt();
    if (!h) return null;
    return el('button', { type: 'button', class: 'knopf', onclick: () => starteNavi(h, true) }, ic('haus'), 'Zur Unterkunft');
  }

  function zeichneOrte(box) {
    const liste = sortiert(gefiltert());
    const chip = (id, label, an, fn, extra) => el('button', { type: 'button', class: 'chip ' + (extra || ''), 'aria-pressed': String(an), onclick: fn }, label);
    const gruppen = el('div', { class: 'chips', role: 'group', 'aria-label': 'Kategorien' },
      chip('alle', 'Alle', S.gruppen.size === 0, () => { S.gruppen.clear(); speicher.set('gruppen', []); zeichne({ anpassen: true }); }),
      GRUPPEN.map((g) => {
        const b = chip(g.id, '', S.gruppen.has(g.id), () => {
          S.gruppen.has(g.id) ? S.gruppen.delete(g.id) : S.gruppen.add(g.id);
          speicher.set('gruppen', [...S.gruppen]); zeichne({ anpassen: true });
        }, 'g-' + g.id);
        b.append(el('span', { class: 'punktfarbe' }), g.label);
        return b;
      }));
    const ex = (id, label, ico) => {
      const b = chip(id, '', S.extra.has(id), () => { S.extra.has(id) ? S.extra.delete(id) : S.extra.add(id); speicher.set('extra', [...S.extra]); zeichne({ anpassen: true }); });
      if (ico) b.append(ic(ico)); b.append(label); return b;
    };
    const extras = el('div', { class: 'filterpanel nur-voll', role: 'group', 'aria-label': 'Weitere Filter', hidden: !S.filterOffen },
      ex('tipp', 'Geheimtipps', 'stern'), ex('offen', 'Jetzt offen'), ex('offenNicht', 'Noch nicht erledigt', 'haken'), ex('fav', 'Gemerkt', 'herz'), ex('gruppe', 'Gruppe will hin', 'gruppe'), ex('aus', 'Ausgeblendete zeigen', 'aus'));
    const nExtra = S.extra.size;
    const sortName = S.sort === 'naehe' ? 'Nähe' : 'Name';
    const zeile = el('div', { class: 'filterzeile' },
      el('button', { type: 'button', class: 'knopf nur-voll', 'aria-expanded': String(!!S.filterOffen), onclick: () => { S.filterOffen = !S.filterOffen; zeichne({ karte: false, scroll: true }); } },
        ic('mehr'), nExtra ? `Filter (${nExtra})` : 'Filter'),
      el('button', { type: 'button', class: 'knopf', 'aria-label': `Sortierung: ${sortName}. Tippen zum Wechseln.`, onclick: () => {
        S.sort = S.sort === 'naehe' ? 'name' : 'naehe'; speicher.set('sort', S.sort); if (S.sort === 'naehe' && !S.me) starteGps(false); zeichne({ karte: false });
      } }, ic('orte'), S.sort === 'naehe' ? 'Nach Nähe' : 'Nach Name'));
    const aktiv = S.gruppen.size + S.extra.size;
    const zuruecksetzen = aktiv ? el('button', { type: 'button', class: 'knopf flach', style: 'margin-top:4px', onclick: () => { S.gruppen.clear(); S.extra.clear(); speicher.set('gruppen', []); speicher.set('extra', []); zeichne({ anpassen: true }); } }, ic('x'), `Filter zurücksetzen (${aktiv})`) : null;
    const kopf = S.suche
      ? el('p', { class: 'leise', style: 'margin:4px 0 0' }, `${liste.length} Treffer für „${S.suche}“`)
      : el('div', {}, gruppen, zeile, extras, zuruecksetzen,
        el('p', { class: 'leise klein', style: 'margin:12px 0 0' }, `${liste.length} von ${ORTE.length} Orten${S.sort === 'naehe' && !S.me ? ' · Standort fehlt, sortiert nach Name' : ''}`));
    setze(box, kopf,
      liste.length ? el('ul', { class: 'liste' }, liste.map((o) => eintragOrt(o)))
        : el('div', { class: 'leer' }, fasan(), el('strong', {}, 'Kein Ort passt.'),
          el('button', { type: 'button', class: 'knopf', onclick: () => { S.gruppen.clear(); S.extra.clear(); S.suche = ''; $('#suche').value = ''; speicher.set('gruppen', []); speicher.set('extra', []); zeichne({ anpassen: true }); } }, 'Filter zurücksetzen')));
  }

  function zeichneGemerkt(box) {
    const teil = (titel, pred, extra) => {
      const l = ORTE.filter((o) => pred(mk(o.id)));
      if (!l.length) return null;
      return el('section', { class: 'abschnitt' }, el('h3', {}, `${titel} (${l.length})`),
        el('ul', { class: 'liste' }, l.map((o) => {
          const li = eintragOrt(o);
          if (extra) li.append(extra(o));
          return li;
        })));
    };
    const teile = [
      teil('Gemerkt', (m) => m.fav && !m.aus),
      teil('Mit Notiz', (m) => m.notiz && !m.aus),
      teil('Bewertet', (m) => m.sterne && !m.aus),
      teil('Erledigt', (m) => m.fertig && !m.aus),
      teil('Ausgeblendet', (m) => m.aus, (o) => el('button', { type: 'button', class: 'knopf', onclick: () => { markiere(o.id, { aus: false }); zeichne({ scroll: true }); toast(`${o.name} wird wieder gezeigt.`); } }, 'Zeigen')),
    ].filter(Boolean);
    setze(box,
      teile.length ? teile : el('div', { class: 'leer' }, fasan(), el('strong', {}, 'Noch nichts gemerkt.'),
        el('span', {}, 'Öffne einen Ort und tippe auf „Merken“. Hier sammeln sich Favoriten, Notizen, Bewertungen und Erledigtes.')),
      el('section', { class: 'abschnitt nur-voll' }, el('h3', {}, 'Mit der Gruppe teilen'),
        el('p', { class: 'leise klein', style: 'margin:0 0 10px' }, 'Deine Markierungen liegen nur auf diesem Handy. Schick sie als Text, zum Beispiel per WhatsApp. Die anderen fügen ihn unter „Einfügen“ ein.'),
        el('div', { class: 'reihe' },
          el('button', { type: 'button', class: 'knopf', onclick: exportiere }, ic('teilen'), 'Senden'),
          el('button', { type: 'button', class: 'knopf', onclick: zeigeImport }, ic('kopie'), 'Einfügen')),
        el('div', { id: 'import-box' })));
  }

  function exportiere() {
    const daten = {};
    for (const [id, m] of Object.entries(M)) daten[id] = m;
    const text = 'FASAN-KARTE ' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, m: daten }))));
    if (navigator.share) navigator.share({ title: 'Meine Lissabon-Markierungen', text }).catch(() => {});
    else kopiere(text, 'Markierungen kopiert. Jetzt in WhatsApp einfügen.');
  }
  function zeigeImport() {
    const feld = el('textarea', { class: 'textfeld', id: 'import-text', placeholder: 'Text mit FASAN-KARTE … hier einfügen' });
    setze($('#import-box'), el('div', { style: 'display:grid;gap:8px;margin-top:10px' }, feld,
      el('button', { type: 'button', class: 'knopf haupt', onclick: () => {
        const m = /FASAN-KARTE\s+([A-Za-z0-9+/=]+)/.exec(feld.value);
        if (!m) { toast('Kein gültiger Text gefunden. Er beginnt mit „FASAN-KARTE“.'); return; }
        try {
          const d = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
          let n = 0;
          for (const [id, x] of Object.entries(d.m || {})) {
            if (!NACH_ID.has(id)) continue;
            const mein = mk(id);
            M[id] = Object.assign({}, mein, { fav: mein.fav || x.fav, fertig: mein.fertig || x.fertig, sterne: mein.sterne || x.sterne,
              notiz: [mein.notiz, x.notiz].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('\n— ') || undefined, aus: mein.aus, t: Date.now() });
            n += 1;
          }
          speicher.set('markierungen', M);
          toast(`${n} Orte übernommen. Notizen wurden ergänzt, nichts gelöscht.`);
          zeichne();
        } catch (e) { toast('Der Text ist beschädigt. Bitte neu kopieren.'); }
      } }, 'Übernehmen')));
    feld.focus();
  }

  function wahl(liste, aktiv, fn) {
    return el('div', { class: 'wahl' }, liste.map(([id, label, text]) => el('button', { type: 'button', 'aria-pressed': String(id === aktiv), onclick: () => fn(id) },
      el('span', { class: 'kreis' }), el('span', {}, label, text ? el('small', {}, text) : null))));
  }

  function zeichneMehr(box) {
    setze(box,
      el('div', { style: 'display:flex;align-items:center;gap:12px;padding-top:4px' }, fasan('klein-fasan'),
        el('div', {}, el('strong', { style: 'font-size:var(--fs-t)' }, 'Fasan Karte'), el('div', { class: 'leise klein' }, `Lissabon · Version ${VERSION}`))),
      el('button', { type: 'button', class: 'knopf breit', style: 'margin-top:14px', onclick: () => zeigeEinfuehrung(0) }, ic('plan'), 'Einführung ansehen'),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Profil'), wahl(PROFILE, E.profil, (id) => { E.profil = id; speichereE(); wendeAn(); hoehe(S.hoehe); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Aussehen'), wahl(THEMES, E.theme, (id) => { E.theme = id; speichereE(); wendeAn(); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Zu Fuß'),
        wahl([['normal', 'Normales Tempo', 'etwa 5 km/h'], ['gemuetlich', 'Gemütlich', 'etwa 4 km/h, mehr Zeit eingeplant']], E.tempo, (id) => { E.tempo = id; speichereE(); zeichne({ scroll: true }); }),
        el('div', { style: 'height:8px' }),
        wahl([['nein', 'Kürzester Weg', 'auch steil und mit Treppen'], ['ja', 'Steigungen und Treppen meiden', 'etwas länger, dafür bequemer']], E.steigung ? 'ja' : 'nein', (id) => { E.steigung = id === 'ja'; speichereE(); zeichne({ scroll: true }); }),
        el('div', { style: 'height:8px' }),
        wahl([['an', 'Sprachansage an', 'sagt die Abbiegungen an'], ['aus', 'Sprachansage aus', null]], E.ansage ? 'an' : 'aus', (id) => { E.ansage = id === 'an'; speichereE(); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Plan'), wahl([['A', 'Plan A', 'Empfehlung: Klassiker mit Geheimtipps'], ['B', 'Plan B', 'Geheimtipps'], ['C', 'Plan C', 'Wenig Steigung'], ['G', 'Gruppenplan', 'Aus euren Stimmen, passt sich bei jedem Abgleich an']], S.plan, (id) => { S.plan = id; speicher.set('plan', id); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Unterkunft'),
        el('p', { class: 'leise klein', style: 'margin:0 0 8px' }, 'Wenn du an der Unterkunft bist: einmal tippen. Der Ort bleibt nur auf diesem Handy. Danach führt dich „Zur Unterkunft“ jederzeit zurück.'),
        E.heimPos
          ? el('div', { class: 'reihe' }, heimKnopf(), el('button', { type: 'button', class: 'knopf warn', onclick: () => { delete E.heimPos; speichereE(); zeichne({ scroll: true }); toast('Unterkunft gelöscht.'); } }, 'Löschen'))
          : el('button', { type: 'button', class: 'knopf breit', onclick: () => {
            if (!S.me) { starteGps(false); toast('Suche deinen Standort … dann nochmal tippen.'); return; }
            E.heimPos = { lat: S.me.lat, lon: S.me.lon, t: Date.now() }; speichereE(); zeichne({ scroll: true }); toast('Unterkunft gespeichert.');
          } }, ic('haus'), 'Hier ist unsere Unterkunft')),
      el('section', { class: 'abschnitt' }, el('h3', {}, `Gut zu wissen in Lissabon · Stand ${STAND_NOTIZEN}`),
        tipps('Fahren', ['Pro Person eine navegante-Karte (0,50 €) am Metro-Automaten.', 'Einzelfahrt 1,90 €. 24-Stunden-Ticket 7,25 €, mit Fähre 10,35 €, mit Zug nach Cascais 11,40 €.', 'Beim Fahrer teurer: Tram 3,30 €, Bus 2,30 €.', 'Gesperrt: Elevador de Santa Justa sowie die Standseilbahnen Glória, Bica und Lavra. Der Funicular da Graça fährt 7–21 Uhr.']),
        tipps('Zeiten', ['Nacht auf Sonntag: Uhren 1 Stunde zurück.', 'Montag zu: Jerónimos und staatliche Museen. Dienstag zu: Gulbenkian.', 'Gulbenkian: „sonntags ab 14 Uhr gratis“ galt vor dem Umbau. Wieder offen seit 18.07.2026 (Observador), Regel nicht neu geprüft.', 'Reservieren: O Frade (So Mittag), Estrela da Bica (Mo Abend).']),
        tipps('Shoppen', ['Sonntags haben laut lisbontourism.org (Stand 21.10.2026) vor allem Einkaufszentren und Läden in Touristengegenden offen.', 'Alle Shopping-Adressen findest du unter „Orte“ mit dem Filter „Shoppen“. Bei jedem Ort steht die Quelle mit Datum.']),
        tipps('Notfall', ['Notruf 112: Polizei, Rettung, Feuerwehr (europaweite Notrufnummer).', 'Taschendiebe laut Auswärtigem Amt (abgerufen 24.10.2026) vor allem an Praça do Comércio, Rua Augusta, in der Alfama, am Castelo de São Jorge, in historischen Straßenbahnen, Bahnhöfen und der Metro.', 'Für Notfälle: einen Treffpunkt unter „Gruppe“ festlegen, dann findet jede und jeder dorthin zurück.']),
        tipps('Vor Ort', ['Couvert (Brot, Oliven, Häppchen) kostet extra. Ablehnen mit „Não, obrigado“. Oft ist Schinken dabei.', 'Trinkgeld 5–10 %. Bei Gruppen steht manchmal schon Service auf der Rechnung.', 'Taschendiebe in Tram 28 und 15E. Falsche Dealer in der Baixa ignorieren.', 'Bargeld am Multibanco-Automaten holen.']),
        tipps('Diese Karte', ['Nummern zeigen die Reihenfolge des Tages. Die gepunktete Linie ist Luftlinie; den Fußweg zeigt die Navigation.', 'Gehzeiten sind geschätzt: 1,3 × Luftlinie bei 4 km/h.', 'Öffnungszeiten stammen aus OpenStreetMap und können veraltet sein.', 'Android: im Chrome-Menü „Zum Startbildschirm hinzufügen“. iPhone: die Karte in Safari nutzen, denn Gruppen-Links aus der Kamera öffnen sich in Safari, und ein Symbol auf dem Home-Bildschirm hätte einen eigenen, getrennten Speicher.'])),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Daten und Verbindungen'),
        el('ul', { class: 'klein', style: 'margin:0;padding-left:20px;display:grid;gap:6px' },
          el('li', {}, 'Keine Konten, keine Statistik, keine Werbung.'),
          el('li', {}, 'Markierungen, Notizen und Unterkunft bleiben auf diesem Handy.'),
          el('li', {}, 'Dein Standort bleibt im Handy. Ausnahmen: „Hinführen“ schickt Start und Ziel an den Routenserver von FOSSGIS (openstreetmap.de). „Standort teilen“ schickt ihn verschlüsselt an deine Gruppe.'),
          el('li', {}, `Live-Abgleich: verschlüsselt (AES-256-GCM) mit dem Schlüssel aus eurem Gruppen-Link, über öffentliche Nostr-Server (${(window.Funk ? Funk.RELAYS : []).map((r) => r.replace('wss://', '')).join(', ')}). Die Server sehen deine IP-Adresse und wann du online bist, nicht den Inhalt. Wer den Gruppen-Link hat, liest mit.`),
          el('li', {}, 'Wetter: holt der Bauprozess auf GitHub bei IPMA und Open-Meteo. Dein Handy fragt dort nicht an.'),
          el('li', {}, 'Kartenbilder von OpenStreetMap. Webseiten und Wikipedia öffnen sich nur, wenn du sie antippst.'))),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Quellen und Lizenzen'),
        el('p', { class: 'klein', style: 'margin:0' }, 'Karte und Orte: © OpenStreetMap-Mitwirkende (ODbL). Texte: Wikipedia (CC BY-SA). Fotos: Wikimedia Commons, Autor und Lizenz stehen unter jedem Bild. Wetter: IPMA (Tage) und Open-Meteo (Stunden, CC BY 4.0). Karte: Leaflet (BSD-2). QR-Codes: qrcode-generator (MIT). Live-Abgleich: nostr-tools (Unlicense). Diese App: MPL-2.0.')),
      el('section', { class: 'abschnitt nur-voll' }, el('h3', {}, 'Zurücksetzen'), el('div', { id: 'reset-box' },
        el('button', { type: 'button', class: 'knopf warn', onclick: () => setze($('#reset-box'),
          el('p', { style: 'margin:0 0 8px' }, 'Alle Markierungen, Notizen und Bewertungen auf diesem Handy löschen?'),
          el('div', { class: 'reihe' },
            el('button', { type: 'button', class: 'knopf', onclick: () => zeichne({ scroll: true }) }, 'Abbrechen'),
            el('button', { type: 'button', class: 'knopf warn', onclick: () => { M = {}; speicher.set('markierungen', M); toast('Alles gelöscht.'); zeichne(); } }, 'Ja, löschen'))) }, 'Markierungen löschen'))));
  }
  const tipps = (titel, punkte) => el('details', { class: 'tipps' }, el('summary', {}, titel), el('ul', {}, punkte.map((p) => el('li', {}, p))));


  // ---------- Gruppenplan: Tagesplan aus den Stimmen ----------
  // Nur Orte mit Zustimmung und ohne „Lieber nicht“ (strittige Orte stehen unter „Gruppe“; Recherche docs/recherche/2026-10-24-gruppenreisen.md),
  // je Tag nach Nähe zum Tagesgebiet aus Plan A, Öffnungstage beachtet, Reihenfolge nach kurzem Fußweg,
  // Mittag- und Abendessen eingeplant. Weniger Stopps im Profil „Einfach“.
  const ESSEN = ['Essen für alle', 'Vegan portugiesisch', 'Vegetarisch'];
  const DAUER = { shop: 75, museum: 90, kirche: 35, aussicht: 20, park: 25, markt: 60, cafe: 30, bar: 45, platz: 20, friedhof: 40, buch: 60, denkmal: 20, turm: 30, weg: 40, kueste: 30, aufzug: 10, tram: 30, faehre: 30 };
  // Belegte Dauer (Spalte „Dauer“, Recherche docs/recherche/2026-10-24-besuchsdauer.md) als Mittelwert, sonst Schätzwert je Typ
  const dauerMin = (o) => { const m = /^(\d+)(?:–(\d+))?$/.exec(o.dauer || ''); return m ? Math.round((+m[1] + +(m[2] || m[1])) / 2) : DAUER[o.typ] || 40; };
  const TAG_IDX = { sa: 6, so: 0, mo: 1 };
  function erlaubteTage(o) {
    const n = `${o.notiz || ''} ${o.dauerQuelle || ''}`, tage = new Set(['sa', 'so', 'mo']);
    if (/nur Sa\b/i.test(n)) return new Set(['sa']);
    if (/nur So\b/i.test(n) || /Kunstmarkt So\b/.test(n)) return new Set(['so']);
    if (o.typ === 'fado' && /Mo und Mi/.test(n)) return new Set(['mo']);
    if (/Sa und So\b/.test(n)) tage.delete('mo');
    if (/Mo zu|So und Mo zu/.test(n)) tage.delete('mo');
    if (/So zu|So und Mo zu|So geschlossen/.test(n)) tage.delete('so');
    if (/Mo geschlossen/.test(n)) tage.delete('mo');
    if (/Mo–Sa/.test(n)) tage.delete('so');
    if (/Mi–Sa/.test(n)) { tage.delete('so'); tage.delete('mo'); }
    const w = o.infos && o.infos.oeffnungszeiten && window.Oeffnung.lies(o.infos.oeffnungszeiten);
    if (w) for (const t of [...tage]) if (!w.woche[TAG_IDX[t]].length) tage.delete(t);
    return tage;
  }
  const mitte = (os) => ({ lat: os.reduce((a, o) => a + o.lat, 0) / os.length, lon: os.reduce((a, o) => a + o.lon, 0) / os.length });
  function reihenfolge(start, os) {
    const rest = os.slice(), weg = [];
    let p = start;
    while (rest.length) { rest.sort((a, b) => meter(p, a.o) - meter(p, b.o)); const n = rest.shift(); weg.push(n); p = n.o; }
    // 2-opt: Kreuzungen auflösen
    const len = (r) => r.reduce((s, x, i) => s + meter(i ? r[i - 1].o : start, x.o), 0);
    let besser = true;
    while (besser) {
      besser = false;
      for (let i = 0; i < weg.length - 1; i++) for (let k = i + 1; k < weg.length; k++) {
        const neu = weg.slice(0, i).concat(weg.slice(i, k + 1).reverse(), weg.slice(k + 1));
        if (len(neu) + 1 < len(weg)) { weg.splice(0, weg.length, ...neu); besser = true; }
      }
    }
    return weg;
  }
  let gpCache = { key: '', plan: null };
  function gruppenplan() {
    const key = JSON.stringify([G.leute, E.profil, Object.keys(M).filter((id) => M[id].aus)]);
    if (gpCache.key === key && gpCache.plan) return gpCache.plan;
    const wertung = ORTE.filter((o) => hatPos(o) && !mk(o.id).aus && o.kategorie !== 'Verkehr' && o.ort === 'Lisboa').map((o) => {
      const { ja, nein } = gruppenStimmen(o.id);
      return { o, ja, nein, wert: ja.length - nein.length };
    }).filter((x) => x.ja.length && !x.nein.length); // ein „Lieber nicht“ = strittig, nicht im Plan (Masthoff 2004: Average Without Misery)
    const plan = { sa: [], so: [], mo: [], uebrig: [] };
    const anker = {};
    for (const t of TAGE) {
      const os = schritte('A', t.id).filter((s) => s.ort).map((s) => NACH_NAME.get(s.ort)).filter(hatPos);
      anker[t.id] = { mitte: os.length ? mitte(os) : { lat: LISSABON[0], lon: LISSABON[1] }, start: os[0] || { lat: LISSABON[0], lon: LISSABON[1] } };
    }
    const maxSehen = E.profil === 'standard' ? 7 : 5;
    const sehen = wertung.filter((x) => !ESSEN.includes(x.o.kategorie) && x.o.typ !== 'fado').sort((a, b) => b.wert - a.wert || b.ja.length - a.ja.length);
    const tagListe = { sa: [], so: [], mo: [] };
    for (const x of sehen) {
      const tage = [...erlaubteTage(x.o)].sort((a, b) => meter(anker[a].mitte, x.o) - meter(anker[b].mitte, x.o));
      const t = tage.find((d) => tagListe[d].length < maxSehen && (tage[0] === d || meter(anker[d].mitte, x.o) < 3500));
      if (t) tagListe[t].push(x); else plan.uebrig.push(x);
    }
    const essen = wertung.filter((x) => ESSEN.includes(x.o.kategorie)).sort((a, b) => b.wert - a.wert);
    const fado = wertung.filter((x) => x.o.typ === 'fado');
    const vergeben = new Set();
    const planEssen = (tag, art) => schritte('A', tag).find((s) => s.ort && new RegExp(art, 'i').test(s.text || ''));
    for (const t of TAGE) {
      const weg = reihenfolge(anker[t.id].start, tagListe[t.id]);
      const steps = [];
      let uhr = 10 * 60, pos = anker[t.id].start, mittag = false;
      const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60 / 5) * 5 % 60).padStart(2, '0')}`;
      const essenWahl = (abends, nahe) => {
        const moeglich = essen.filter((x) => !vergeben.has(x.o.id) && erlaubteTage(x.o).has(t.id) && (abends || !/Nur abends|Abends ab/i.test(x.o.notiz)));
        const radius = abends ? 2500 : 1500; // kein Umweg quer durch die Stadt fürs Mittagessen
        const k = moeglich.filter((x) => meter(nahe, x.o) <= radius).sort((a, b) => b.wert - a.wert || meter(nahe, a.o) - meter(nahe, b.o))[0];
        if (k) { vergeben.add(k.o.id); return { o: k.o, text: `${abends ? 'Abendessen' : 'Mittagessen'} · 👍 ${k.ja.join(', ')}` }; }
        const ausPlan = planEssen(t.id, abends ? 'Abend' : 'Mittag');
        const planOrt = ausPlan && NACH_NAME.get(ausPlan.ort);
        if (!planOrt || vergeben.has(planOrt.id) || !hatPos(planOrt) || meter(nahe, planOrt) > radius * 1.5) {
          const nah = ORTE.filter((o) => ESSEN.includes(o.kategorie) && hatPos(o) && o.ort === 'Lisboa' && !vergeben.has(o.id) && !mk(o.id).aus
            && erlaubteTage(o).has(t.id) && (abends || !/Nur abends|Abends ab/i.test(o.notiz)) && gruppenStimmen(o.id).nein.length === 0)
            .sort((a, b) => meter(nahe, a) - meter(nahe, b))[0];
          if (!nah) return null;
          vergeben.add(nah.id);
          return { o: nah, text: `${abends ? 'Abendessen' : 'Mittagessen'}: Vorschlag in der Nähe (noch keine Stimmen)` };
        }
        vergeben.add(NACH_NAME.get(ausPlan.ort).id);
        return { o: NACH_NAME.get(ausPlan.ort), text: `${abends ? 'Abendessen' : 'Mittagessen'} aus Plan A (noch keine Stimmen dafür)` };
      };
      weg.forEach((x, i) => {
        // Mittag dort, wo man gerade ist, bevor es weitergeht
        if (!mittag && i > 0 && uhr >= 12 * 60 + 15) {
          const e = essenWahl(false, pos);
          if (e && e.o) { uhr = Math.max(uhr + gehzeit(meter(pos, e.o)), 12 * 60 + 30); steps.push({ ort: e.o.name, zeit: fmt(uhr), text: e.text }); uhr += 75; pos = e.o; }
          mittag = true;
        }
        const strecke_m = meter(pos, x.o);
        if (strecke_m > 2500) steps.push({ hinweis: `Weiter Weg (${strecke(strecke_m)}): besser Tram, Bus oder Metro nehmen` });
        uhr += strecke_m > 2500 ? 35 : gehzeit(strecke_m);
        if (i === 3 && E.profil !== 'standard') steps.push({ hinweis: 'Kurze Pause: hinsetzen, etwas trinken' });
        steps.push({ ort: x.o.name, zeit: fmt(uhr), text: `👍 ${x.ja.join(', ')}${x.nein.length ? ` · 👎 ${x.nein.join(', ')}` : ''}` });
        uhr += dauerMin(x.o); pos = x.o;
      });
      if (weg.length && !mittag) {
        const e = essenWahl(false, pos);
        if (e && e.o) { uhr = Math.max(uhr + gehzeit(meter(pos, e.o)), 12 * 60 + 30); steps.push({ ort: e.o.name, zeit: fmt(uhr), text: e.text }); uhr += 75; pos = e.o; }
      }
      if (weg.length && uhr < 16 * 60) steps.push({ hinweis: `Ab etwa ${fmt(uhr)} frei: Stimmt für mehr Orte ab, dann füllt sich der Tag.` });
      if (weg.length) {
        const e = essenWahl(true, pos);
        if (e && e.o) steps.push({ ort: e.o.name, zeit: fmt(Math.max(uhr + gehzeit(meter(pos, e.o)), 19 * 60 + 30)), text: e.text });
        const f = fado.find((x) => erlaubteTage(x.o).has(t.id));
        if (f) steps.push({ ort: f.o.name, zeit: '21:00', text: `Fado · 👍 ${f.ja.join(', ')}` });
      }
      plan[t.id] = steps;
    }
    gpCache = { key, plan };
    return plan;
  }

  // ---------- Treffpunkt ----------
  const treffOrt = () => (G.treff && !G.treff.geloescht ? { id: 'treff', name: `Treffpunkt: ${G.treff.name}`, kategorie: 'Verkehr', typ: 'treff', adresse: G.treff.name, notiz: '', lat: G.treff.lat, lon: G.treff.lon } : null);
  function treffKarte() {
    if (!G.treff || G.treff.geloescht) return null;
    const t = G.treff, o = treffOrt();
    const d = S.me ? meter(S.me, o) : null;
    const von = t.von === (G.ich && G.ich.id) ? meinName() : ((G.leute[t.von] || {}).name || 'Jemand');
    return el('div', { class: 'treff-karte' },
      el('div', { class: 'zeile', style: 'display:flex;gap:12px;align-items:center' },
        el('span', { class: 'marker treff' }, symbol({ typ: 'treff', kategorie: 'Verkehr' })),
        el('div', { class: 'was', style: 'flex:1;min-width:0' }, el('small', {}, `Treffpunkt · von ${von}${d != null ? ` · ${gehzeit(d)} Min. zu Fuß` : ''}`),
          el('strong', {}, `${t.zeit} Uhr · ${t.name}`))),
      el('div', { class: 'reihe' },
        el('button', { type: 'button', class: 'knopf haupt', style: 'flex:2 1 160px', onclick: () => starteNavi(o, true) }, ic('route'), 'Hinführen'),
        el('button', { type: 'button', class: 'knopf nur-voll', style: 'flex:1 1 100px', onclick: () => { S.treffForm = { zeit: t.zeit, q: '' }; S.tab = 'gruppe'; hoehe('gross'); zeichne(); } }, 'Ändern')));
  }
  function treffForm() {
    const f = S.treffForm;
    const zeit = el('input', { id: 'treff-zeit', type: 'time', value: f.zeit, step: '300', 'aria-label': 'Uhrzeit' });
    zeit.addEventListener('input', () => { f.zeit = zeit.value; });
    const such = el('input', { id: 'treff-suche', type: 'search', placeholder: 'Ort suchen', value: f.q || '', 'aria-label': 'Ort für den Treffpunkt suchen' });
    const liste = el('ul', { class: 'liste auswahl' });
    const speichere = (name, lat, lon) => {
      if (!f.zeit) { toast('Gib eine Uhrzeit ein.'); return; }
      ich();
      G.treff = { name, lat, lon, zeit: f.zeit, von: G.ich.id, t: Date.now() };
      G.leute[G.ich.id].t = Date.now(); speichereG();
      S.treffForm = null; zeichne({ anpassen: true });
      toast(F.an && F.status.verbunden ? 'Treffpunkt gespeichert. Alle mit offener App sehen ihn gleich.' : 'Treffpunkt gespeichert. Ohne Live-Verbindung: QR zeigen oder Link senden.', F.an && F.status.verbunden ? {} : { aktion: 'Link senden', fn: teileGruppe });
    };
    const fuelle = () => {
      const q = falte(f.q || '');
      setze(liste, ORTE.filter((o) => hatPos(o) && (!q || falte(o.name).includes(q))).sort((a, b) => (S.me ? meter(S.me, a) - meter(S.me, b) : a.name.localeCompare(b.name, 'pt'))).slice(0, 30)
        .map((o) => el('li', {}, el('button', { type: 'button', class: 'waehle', onclick: () => speichere(o.name, o.lat, o.lon) },
          el('span', { class: 'marker g-' + gruppeVon(o.kategorie), style: 'width:32px;height:32px' }, symbol(o)), el('span', {}, o.name, el('small', {}, o.kategorie))))));
    };
    such.addEventListener('input', () => { f.q = such.value; fuelle(); });
    fuelle();
    return el('div', { class: 'karte-box', style: 'display:grid;gap:10px' },
      el('strong', {}, 'Treffpunkt festlegen'),
      el('label', { for: 'treff-zeit', class: 'klein leise' }, 'Uhrzeit'), zeit,
      el('button', { type: 'button', class: 'knopf', onclick: () => { if (!S.me) { starteGps(false); toast('Suche deinen Standort … dann nochmal tippen.'); return; } speichere('hier, wo ich gerade bin', S.me.lat, S.me.lon); } }, ic('standort'), 'Hier, wo ich gerade bin'),
      el('span', { class: 'klein leise' }, 'Oder einen Ort wählen:'), such, liste,
      el('div', { class: 'reihe' },
        el('button', { type: 'button', class: 'knopf', onclick: () => { S.treffForm = null; zeichne({ scroll: true }); } }, 'Abbrechen'),
        G.treff && !G.treff.geloescht ? el('button', { type: 'button', class: 'knopf warn', onclick: () => { G.treff = { geloescht: true, von: ich() && G.ich.id, t: Date.now() }; ich().t = Date.now(); speichereG(); S.treffForm = null; zeichne(); toast(F.an && F.status.verbunden ? 'Treffpunkt gelöscht.' : 'Treffpunkt gelöscht. Ohne Live-Verbindung: Link senden, damit es alle wissen.'); } }, 'Treffpunkt löschen') : null));
  }

  // ---------- Gruppe: Live, Nachrichten, Angepinntes ----------
  const uhrzeit = (t) => { const d = new Date(t), h = new Date(); const z = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; return d.toDateString() === h.toDateString() ? z : `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]} ${z}`; };
  function funkAnzeige() { if (S.tab === 'gruppe' && !S.ort) neuZeichnen(); }
  function pinKarte() {
    if (!G.pin || G.pin.weg || !G.pin.x) return null;
    const von = G.ich && G.pin.von === G.ich.id ? 'dir' : G.pin.n || 'jemandem';
    return el('div', { class: 'pin-karte', role: 'note' }, ic('pin'),
      el('div', { class: 'pin-text' }, el('small', {}, `Angepinnt von ${von} · ${uhrzeit(G.pin.t)}`), el('p', {}, G.pin.x)),
      G.ich && G.ich.name ? el('button', { type: 'button', class: 'knopf flach nur-voll', onclick: () => { anpinnen(null); zeichne({ scroll: true, karte: false }); toast('Gelöst.'); } }, 'Lösen') : null);
  }
  const personOrt = (id) => { const x = F.leuteOrt.get(id); return x ? { id: 'p-' + id, name: x.n, kategorie: 'Verkehr', typ: 'treff', adresse: `Position von ${uhrzeit(x.ts)}`, notiz: '', lat: x.lat, lon: x.lon } : null; };
  function liveTeil() {
    const st = F.status, verbunden = F.an && st.verbunden > 0;
    const da = [...F.gehoert].filter(([, t]) => Date.now() - t < 180000).map(([id]) => (G.leute[id] && G.leute[id].name) || (F.leuteOrt.get(id) || {}).n).filter(Boolean);
    const bis = E.teilenBis ? new Date(E.teilenBis) : null;
    const startTeilen = (ms) => {
      E.teilenBis = ms; speichereE();
      if (S.watchId == null) starteGps(false);
      if (S.me) funkOrt(S.me, true);
      toast(verbunden ? 'Die Gruppe sieht dich jetzt auf der Karte, solange deine App offen ist.' : 'Wird geteilt, sobald Live verbunden ist.');
      zeichne({ scroll: true, karte: false });
    };
    const mitternacht = new Date(); mitternacht.setHours(23, 59, 0, 0);
    const teilen = teileOrt()
      ? el('div', { class: 'reihe' }, el('p', { style: 'margin:0;flex:1 1 160px' }, el('strong', {}, 'Du teilst deinen Standort'), ` bis ${uhrzeit(bis.getTime())}.`),
        el('button', { type: 'button', class: 'knopf warn', onclick: () => { teilenEnde(); zeichne({ scroll: true, karte: false }); } }, 'Nicht mehr teilen'))
      : el('div', { style: 'display:grid;gap:8px' }, el('strong', {}, 'Meinen Standort mit der Gruppe teilen'),
        el('div', { class: 'reihe' },
          el('button', { type: 'button', class: 'knopf', style: 'flex:1 1 130px', onclick: () => startTeilen(Date.now() + 3600e3) }, ic('standort'), '1 Stunde'),
          el('button', { type: 'button', class: 'knopf', style: 'flex:1 1 130px', onclick: () => startTeilen(mitternacht.getTime()) }, ic('standort'), 'Bis Mitternacht')));
    const leute = [...F.leuteOrt].sort((a, b) => (S.me ? meter(S.me, a[1]) - meter(S.me, b[1]) : b[1].ts - a[1].ts));
    const liste = leute.length ? el('ul', { class: 'liste' }, leute.map(([id, x]) => el('li', { class: 'eintrag person-zeile' },
      el('button', { type: 'button', class: 'auf', onclick: () => { if (karte) { hoehe('klein'); karte.setView([x.lat, x.lon], 17); } } },
        el('span', { class: 'marker person' + (Date.now() - x.ts > 600000 ? ' alt' : '') }, initialen(x.n)),
        el('span', { class: 'text' }, el('span', { class: 'titel' }, x.n),
          el('span', { class: 'unter' }, [S.me ? `${strecke(meter(S.me, x))} entfernt` : null, `Stand ${uhrzeit(x.ts)} (${zeitHer(x.ts)})`].filter(Boolean).join(' · ')))),
      el('button', { type: 'button', class: 'haken', 'aria-label': `Zu ${x.n} hinführen`, onclick: () => starteNavi(personOrt(id), true) }, ic('route'))))) : null;
    return el('section', { class: 'karte-box live', style: 'margin-top:4px;display:grid;gap:10px' },
      el('div', { class: 'live-kopf' }, el('span', { class: 'lampe ' + (verbunden ? 'an' : F.an ? 'sucht' : 'aus'), 'aria-hidden': 'true' }),
        el('strong', {}, verbunden ? 'Live verbunden' : F.an ? 'Verbinde …' : 'Live aus'),
        verbunden ? el('span', { class: 'leise klein' }, `${st.verbunden} von ${st.gesamt} Servern · verschlüsselt`) : null),
      el('p', { class: 'leise klein', style: 'margin:0' }, verbunden
        ? (da.length ? `Gerade auch offen: ${da.join(', ')}. ` : 'Gerade ist sonst niemand online. ') + 'Stimmen, Umfragen, Treffpunkt und Nachrichten gleichen sich von selbst ab, sobald ein anderes Handy die App offen hat.'
        : F.an ? 'Noch kein Server erreicht. Der Abgleich per QR-Code oder Link geht immer.' : E.funk === false ? 'Du hast den Live-Abgleich ausgeschaltet. Abgleich per QR-Code oder Link.' : 'Live-Abgleich startet …'),
      teilen,
      liste,
      el('p', { class: 'leise klein', style: 'margin:0' }, 'Positionen kommen nur, solange die App offen ist. Die Server sehen nur Verschlüsseltes, manche halten es ein paar Minuten vor. Für unterwegs in der Tasche: WhatsApp-Live-Standort.'),
      el('button', { type: 'button', class: 'knopf flach nur-voll', style: 'justify-self:start;min-height:48px', onclick: () => {
        E.funk = E.funk === false; speichereE();
        if (E.funk === false) { if (teileOrt()) teilenEnde(true); funkStopp(); } else funkStart();
        zeichne({ scroll: true, karte: false });
      } }, E.funk === false ? 'Live-Abgleich einschalten' : 'Live-Abgleich ausschalten'));
  }
  function nachrichtenTeil() {
    const eingabe = el('input', { id: 'nachricht', type: 'text', maxlength: '300', placeholder: 'Nachricht an alle', enterkeyhint: 'send', autocomplete: 'off', 'aria-label': 'Nachricht an die Gruppe' });
    const senden = () => {
      if (!nachrichtSenden(eingabe.value)) { eingabe.focus(); return; }
      F.warteZeichnen = false; eingabe.blur();
      zeichne({ scroll: true, karte: false });
      if (!(F.an && F.status.verbunden)) toast('Gespeichert. Geht raus, sobald Live verbunden ist.');
    };
    eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); senden(); } });
    const liste = nachrichtenListe().slice(0, 30);
    return el('section', { class: 'abschnitt' }, el('h3', {}, 'Nachrichten'),
      el('div', { class: 'feld' }, eingabe, el('button', { type: 'button', class: 'knopf haupt', onclick: senden }, 'Senden')),
      liste.length ? el('ul', { class: 'nachrichten' }, liste.map(([, x]) => {
        const meine = G.ich && x.von === G.ich.id;
        return el('li', { class: 'nachricht' + (meine ? ' meine' : '') },
          el('div', { class: 'n-kopf' }, el('strong', {}, meine ? 'Du' : x.n || 'Jemand'), el('span', { class: 'leise klein' }, uhrzeit(x.t)),
            el('button', { type: 'button', class: 'knopf flach nur-voll n-pin', onclick: () => { anpinnen(x.x); zeichne({ scroll: true, karte: false }); toast('Angepinnt. Alle sehen es oben im Tagesplan.'); } }, ic('pin'), 'Anpinnen')),
          el('p', {}, x.x));
      })) : el('p', { class: 'leise klein', style: 'margin:10px 0 0' }, 'Noch keine Nachrichten. Was du schreibst, sehen alle in eurer Gruppe. Wichtiges zum Anpinnen: Treffpunkt, Zeiten, Notfallnummer.'));
  }

  // ---------- Gruppe: Ansicht ----------
  const initialen = (n) => (String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase();
  const zeitHer = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} Min.` : m < 1440 ? `vor ${Math.round(m / 60)} Std.` : `vor ${Math.round(m / 1440)} Tagen`; };
  function zeichneGruppe(box) {
    if (!G.ich || !G.ich.name) {
      const feld = el('input', { id: 'gruppe-name', type: 'text', autocomplete: 'given-name', placeholder: 'Dein Vorname', maxlength: '30' });
      const los = () => { const n = feld.value.trim(); if (!n) { feld.focus(); return; } ich(); G.ich.name = n; G.leute[G.ich.id].name = n; G.leute[G.ich.id].t = Date.now(); speichereG(); funkStart(); zeichne(); };
      feld.addEventListener('keydown', (e) => { if (e.key === 'Enter') los(); });
      setze(box, el('div', { class: 'leer' }, fasan(), el('strong', { style: 'font-size:var(--fs-t)' }, 'Gemeinsam entscheiden')),
        el('p', { style: 'margin:0 0 6px' }, 'Jede und jeder stimmt bei Orten ab: „Will hin“ oder „Lieber nicht“. Dazu kommen Umfragen wie „Wohin heute Abend?“.'),
        el('p', { class: 'leise klein', style: 'margin:0 0 14px' }, 'Einmal per QR-Code oder Link verbinden. Danach gleicht sich alles live und verschlüsselt ab, ohne Konto. Dein Name ist nur für die Gruppe.'),
        el('div', { class: 'feld' }, feld, el('button', { type: 'button', class: 'knopf haupt', onclick: los }, 'Los')));
      return;
    }
    const leute = Object.entries(G.leute).filter(([id]) => id !== G.ich.id).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
    const liste = rangliste();
    const umfragen = Object.entries(G.umfragen).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));

    const iosApp = IOS && (navigator.standalone || matchMedia('(display-mode: standalone)').matches);
    const abgleich = el('section', { class: 'karte-box', style: 'margin-top:4px;display:grid;gap:10px' },
      iosApp ? el('p', { class: 'hilfe', style: 'margin:0' }, el('span', {}, 'Auf dem iPhone öffnen sich Gruppen-Links in Safari, nicht in diesem Home-Bildschirm-Symbol. Nutze für die Gruppe die Karte direkt in Safari.')) : null,
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px' },
        el('strong', {}, `Du bist ${meinName()}`),
        el('button', { type: 'button', class: 'knopf flach nur-voll', style: 'min-height:48px;padding:0 10px', onclick: () => { G.ich.name = ''; speichereG(); zeichne(); } }, 'Ändern')),
      el('div', { class: 'reihe' },
        el('button', { type: 'button', class: 'knopf haupt', style: 'flex:1 1 140px', onclick: zeigeQr }, ic('qr'), 'QR zeigen'),
        el('button', { type: 'button', class: 'knopf', style: 'flex:1 1 140px', onclick: teileGruppe }, ic('teilen'), 'Link senden')),
      el('p', { class: 'leise klein', style: 'margin:0' }, leute.length
        ? `Abgeglichen mit: ${leute.map(([, p]) => `${p.name || 'Jemand'} (${zeitHer(p.t)})`).join(', ')}.`
        : 'Noch niemand verbunden. Zeig deinen QR-Code oder schick den Link in eure WhatsApp-Gruppe. Einmal reicht: danach läuft der Abgleich live.'));

    const umfrageTeil = el('section', { class: 'abschnitt' }, el('h3', {}, 'Umfragen'),
      S.neueUmfrage ? formUmfrage() : el('button', { type: 'button', class: 'knopf breit nur-voll', onclick: () => { S.neueUmfrage = { frage: 'Wohin heute Abend?', o: [] }; zeichne({ scroll: true, karte: false }); } }, ic('plan'), 'Neue Umfrage'),
      umfragen.length ? umfragen.map(([id, u]) => karteUmfrage(id, u)) : (S.neueUmfrage ? null : el('p', { class: 'leise klein', style: 'margin:10px 0 0' }, 'Noch keine Umfrage. Neue Umfragen sehen alle mit offener App sofort.')));

    const strittig = liste.filter((x) => x.ja.length && x.nein.length);
    const strittigTeil = strittig.length ? el('section', { class: 'abschnitt' }, el('h3', {}, `Strittig (${strittig.length})`),
      el('p', { class: 'leise klein', style: 'margin:0 0 6px' }, 'Hier will jemand lieber nicht hin. Diese Orte plant der Gruppenplan nicht ein. Redet kurz darüber, vielleicht geht eine Teilgruppe hin und ihr trefft euch danach am Treffpunkt.'),
      el('ul', { class: 'liste' }, strittig.map(({ o }) => eintragOrt(o)))) : null;
    const rang = el('section', { class: 'abschnitt' }, el('h3', {}, 'Was die Gruppe will'),
      liste.length ? el('ol', { class: 'liste' }, liste.map(({ o, ja, nein }, i) => {
        const li = eintragOrt(o, { nr: i + 1 });
        const zeile = el('span', { class: 'unter stimmen' },
          ja.length ? el('span', { class: 'ja' }, `👍 ${ja.length}: ${ja.join(', ')}`) : null,
          nein.length ? el('span', { class: 'nein' }, `👎 ${nein.length}: ${nein.join(', ')}`) : null,
          ja.length && nein.length ? el('span', { class: 'abzeichen warn', style: 'font-size:12px' }, 'uneinig') : null);
        li.querySelector('.text').append(zeile);
        return li;
      })) : el('p', { class: 'leise klein', style: 'margin:0' }, 'Noch keine Stimmen. Öffne einen Ort und tippe auf „Will hin“ oder „Lieber nicht“.'));
    const treffTeil = el('section', { class: 'abschnitt' }, el('h3', {}, 'Treffpunkt'),
      S.treffForm ? treffForm() : treffKarte() || el('button', { type: 'button', class: 'knopf breit', onclick: () => {
        const d = new Date(Date.now() + 90 * 60000); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
        S.treffForm = { zeit: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, q: '' }; zeichne({ scroll: true });
      } }, ic('orte'), 'Treffpunkt festlegen'));
    if (document.visibilityState === 'visible') { speicher.set('gelesen', Date.now()); leisteZahl(); }
    // Ohne bekannte Mitreisende zuerst der Abgleich per QR/Link: darüber kommt auch der Gruppenschlüssel
    if (!leute.length) setze(box, pinKarte(), abgleich, liveTeil(), nachrichtenTeil(), treffTeil, umfrageTeil, rang, strittigTeil);
    else setze(box, pinKarte(), liveTeil(), nachrichtenTeil(), treffTeil, umfrageTeil, rang, strittigTeil, abgleich);
  }

  function formUmfrage() {
    const f = S.neueUmfrage;
    const frage = el('input', { id: 'umfrage-frage', type: 'text', value: f.frage, maxlength: '100', 'aria-label': 'Frage' });
    frage.addEventListener('input', () => { f.frage = frage.value; });
    const such = el('input', { id: 'umfrage-suche', type: 'search', placeholder: 'Orte filtern', 'aria-label': 'Orte filtern', value: f.q || '' });
    const auswahl = el('ul', { class: 'liste auswahl' });
    const fuelle = () => {
      const q = falte(f.q || '');
      const kandidaten = ORTE.filter((o) => !mk(o.id).aus && (!q || falte(o.name + ' ' + o.kategorie).includes(q)))
        .sort((a, b) => (f.o.includes(b.id) - f.o.includes(a.id)) || (mk(b.id).fav ? 1 : 0) - (mk(a.id).fav ? 1 : 0) || a.name.localeCompare(b.name, 'pt'));
      setze(auswahl, kandidaten.map((o) => el('li', {},
        el('button', { type: 'button', class: 'waehle', 'aria-pressed': String(f.o.includes(o.id)), onclick: () => {
          if (f.o.includes(o.id)) f.o = f.o.filter((x) => x !== o.id); else if (f.o.length < 6) f.o.push(o.id); else toast('Höchstens 6 Orte pro Umfrage.');
          fuelle(); zaehler.textContent = `${f.o.length} von 6 gewählt`;
        } }, el('span', { class: 'kasten' }, ic('haken')), el('span', {}, o.name, el('small', {}, o.kategorie))))));
    };
    such.addEventListener('input', () => { f.q = such.value; fuelle(); });
    const zaehler = el('span', { class: 'leise klein' }, `${f.o.length} von 6 gewählt`);
    fuelle();
    return el('div', { class: 'karte-box', style: 'display:grid;gap:10px' },
      el('label', { for: 'umfrage-frage', class: 'klein leise' }, 'Frage'), frage,
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, el('span', { class: 'klein leise' }, 'Orte zur Auswahl (2–6)'), zaehler),
      such, auswahl,
      el('div', { class: 'reihe' },
        el('button', { type: 'button', class: 'knopf', onclick: () => { S.neueUmfrage = null; zeichne({ scroll: true, karte: false }); } }, 'Abbrechen'),
        el('button', { type: 'button', class: 'knopf haupt', onclick: () => {
          if (f.o.length < 2) { toast('Wähle mindestens 2 Orte.'); return; }
          if (!f.frage.trim()) { toast('Gib eine Frage ein.'); return; }
          const me = ich();
          const id = neueId();
          G.umfragen[id] = { von: G.ich.id, frage: f.frage.trim(), o: f.o.slice(), t: Date.now() };
          me.t = Date.now(); speichereG();
          S.neueUmfrage = null; zeichne();
          toast(F.an && F.status.verbunden ? 'Umfrage gestartet. Alle mit offener App sehen sie gleich.' : 'Umfrage gestartet. Ohne Live-Verbindung: QR zeigen oder Link senden.', F.an && F.status.verbunden ? {} : { aktion: 'Link senden', fn: teileGruppe });
        } }, 'Umfrage starten')));
  }

  function karteUmfrage(id, u) {
    const me = ich();
    const meine = (me.a && me.a[id]) || [];
    const stimmen = u.o.map((oid) => {
      const namen = [];
      for (const [pid, p] of Object.entries(G.leute)) if (((p.a || {})[id] || []).includes(oid)) namen.push(pid === G.ich.id ? meinName() : p.name || 'Jemand');
      return { oid, namen };
    });
    const max = Math.max(1, ...stimmen.map((s) => s.namen.length));
    const teilnehmer = Object.values(G.leute).filter((p) => ((p.a || {})[id] || []).length).length;
    const vonName = u.von === G.ich.id ? meinName() : (G.leute[u.von] || {}).name || 'Jemand';
    return el('article', { class: 'umfrage' },
      el('strong', { class: 'umfrage-frage' }, u.frage),
      el('span', { class: 'leise klein' }, `von ${vonName} · ${teilnehmer} haben abgestimmt · mehrere Antworten möglich`),
      el('div', { style: 'display:grid;gap:8px;margin-top:8px' }, stimmen.map(({ oid, namen }) => {
        const o = NACH_ID.get(oid);
        if (!o) return null;
        const an = meine.includes(oid);
        return el('button', { type: 'button', class: 'option', 'aria-pressed': String(an), onclick: () => {
          const neu = an ? meine.filter((x) => x !== oid) : meine.concat(oid);
          me.a = Object.assign({}, me.a, { [id]: neu }); me.t = Date.now(); speichereG(); zeichne({ scroll: true });
        } },
        el('span', { class: 'balken', style: `width:${(namen.length / max) * 100}%` }),
        el('span', { class: 'kasten' }, ic('haken')),
        el('span', { class: 'option-text' }, o.name, el('small', {}, namen.length ? `${namen.length}: ${namen.join(', ')}` : 'noch keine Stimme')));
      })),
      el('div', { class: 'reihe', style: 'margin-top:8px' },
        el('button', { type: 'button', class: 'knopf flach', onclick: teileGruppe }, ic('teilen'), 'Antwort senden'),
        u.von === G.ich.id ? el('button', { type: 'button', class: 'knopf flach warn nur-voll', onclick: () => { delete G.umfragen[id]; speichereG(); zeichne({ scroll: true }); toast('Umfrage entfernt (nur auf diesem Handy).'); } }, 'Entfernen') : null));
  }

  // ---------- Ortsdetail ----------
  function oeffneOrt(id, ausListe) {
    const o = NACH_ID.get(id);
    if (!o) return;
    const war = S.ort;
    S.ort = id;
    if (!war) { try { history.pushState({ ort: id }, '', '#ort-' + id); } catch (e) { /* egal */ } }
    else { try { history.replaceState({ ort: id }, '', '#ort-' + id); } catch (e) { /* egal */ } }
    hoehe(ausListe && S.hoehe === 'gross' ? 'gross' : 'mitte');
    zeichne();
    S.follow = false; gpsKnopf();
    requestAnimationFrame(() => zeigeAufKarte(o));
  }
  function schliesseOrt(ausHistory) {
    if (!S.ort) return;
    S.ort = null;
    if (!ausHistory) { try { if (history.state && history.state.ort) history.back(); else history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ } }
    zeichne();
  }
  addEventListener('popstate', () => { if (S.ort && !/^#ort-/.test(location.hash)) schliesseOrt(true); else if (/^#ort-/.test(location.hash)) { const id = location.hash.slice(5); if (NACH_ID.has(id) && S.ort !== id) oeffneOrt(id); } });

  function stimmBlock(o) {
    const v = meineStimme(o.id);
    const { ja, nein } = gruppenStimmen(o.id);
    const setz = (w) => { stimme(o.id, v === w ? 0 : w); zeichne({ scroll: true }); if (!G.ich.name) toast('Gespeichert. Unter „Gruppe“ deinen Namen eingeben, dann abgleichen.'); };
    return el('section', { class: 'abschnitt' }, el('h3', {}, 'Deine Stimme für die Gruppe'),
      el('div', { class: 'segmente stimme', role: 'group', 'aria-label': 'Deine Stimme' },
        el('button', { type: 'button', 'aria-pressed': String(v === 1), class: 'ja', onclick: () => setz(1) }, ic('hoch'), 'Will hin'),
        el('button', { type: 'button', 'aria-pressed': String(v === -1), class: 'nein', onclick: () => setz(-1) }, ic('runter'), 'Lieber nicht')),
      ja.length || nein.length ? el('p', { class: 'klein', style: 'margin:8px 0 0' },
        ja.length ? `👍 ${ja.join(', ')}` : '', ja.length && nein.length ? ' · ' : '', nein.length ? `👎 ${nein.join(', ')}` : '') : null);
  }

  function zeichneOrt(box) {
    const o = NACH_ID.get(S.ort), m = mk(o.id), g = gruppeVon(o.kategorie);
    const d = S.me && hatPos(o) ? meter(S.me, o) : null;
    const aktion = (cls, name, label, an, fn) => el('button', { type: 'button', class: 'aktion ' + cls, 'aria-pressed': an == null ? null : String(!!an), onclick: fn }, ic(name), label);
    const st = status(o);
    const wochen = o.infos && o.infos.oeffnungszeiten ? window.Oeffnung.woche(o.infos.oeffnungszeiten) : null;
    const rollstuhl = { yes: 'rollstuhlgerecht', limited: 'teilweise rollstuhlgerecht', no: 'nicht rollstuhlgerecht' }[(o.infos || {}).rollstuhl];
    const kueche = (o.infos || {}).kueche ? o.infos.kueche.split(';').map((k) => ({ regional: 'regional', portuguese: 'portugiesisch', vegetarian: 'vegetarisch', vegan: 'vegan', coffee_shop: 'Café', international: 'international', mediterranean: 'mittelmeerisch', seafood: 'Fisch und Meeresfrüchte', asian: 'asiatisch' }[k.trim()] || k.trim())).join(', ') : null;
    const veg = (o.infos || {}).vegan === 'only' ? 'nur vegan' : (o.infos || {}).vegetarisch === 'only' ? 'nur vegetarisch'
      : ((o.infos || {}).vegan === 'yes' ? 'vegane Gerichte' : (o.infos || {}).vegetarisch === 'yes' ? 'vegetarische Gerichte' : null);
    const info = (dt, dd) => (dd ? el('div', {}, el('dt', {}, dt), el('dd', {}, dd)) : null);
    const plaene = inPlaenen(o);
    const notiz = el('textarea', { class: 'notiz-feld', id: 'notiz', placeholder: 'Eigene Notiz, zum Beispiel: „Unbedingt die Ginjinha im Schokobecher probieren“' });
    notiz.value = m.notiz || '';
    let notizTimer = null;
    const gespeichert = el('span', { class: 'leise klein', 'aria-live': 'polite' });
    notiz.addEventListener('input', () => {
      clearTimeout(notizTimer);
      notizTimer = setTimeout(() => { markiere(o.id, { notiz: notiz.value.trim() || undefined }); gespeichert.textContent = 'Gespeichert'; karteZeichnen(); }, 500);
    });

    setze(box,
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
        el('button', { type: 'button', class: 'knopf flach zurueck', onclick: () => schliesseOrt() }, ic('zurueck'), 'Zurück'),
        el('button', { type: 'button', class: 'knopf flach', 'aria-label': 'Ort schließen', onclick: () => schliesseOrt() }, ic('x'))),
      o.bild ? el('figure', { class: 'bild', style: 'margin:4px 0 0' },
        el('img', { src: o.bild.src, alt: `Foto: ${o.name}`, width: o.bild.breite, height: o.bild.hoehe }),
        el('figcaption', {}, 'Foto: ', o.bild.autor, ' · ', el('a', { href: o.bild.quelle, target: '_blank', rel: 'noopener' }, o.bild.lizenz)))
        : el('div', { class: `bild-ersatz g-${gruppeVon(o.kategorie)}` }, symbol(o), el('span', {}, TYP_NAME[o.typ] || o.kategorie)),
      el('h2', { class: 'ort-titel' }, o.name),
      el('div', { class: 'ort-unter' },
        el('span', { class: 'marker g-' + g, style: 'width:28px;height:28px' }, ic(g)), o.kategorie,
        o.ort && o.ort !== 'Lisboa' ? el('span', {}, '· ' + o.ort) : null,
        d != null ? el('span', {}, `· ${strecke(d)}, etwa ${gehzeit(d)} Min. zu Fuß`) : null,
        o.dauer ? el('span', {}, `· vor Ort ${o.dauer} Min.`) : null),
      el('div', { class: 'reihe', style: 'margin-top:8px' },
        istTipp(o) ? el('span', { class: 'abzeichen tipp' }, ic('stern'), 'Geheimtipp') : null,
        plaene.map((p) => el('span', { class: 'abzeichen' }, p)),
        o.quelle === 'pruefen' ? el('span', { class: 'abzeichen warn' }, 'Kartenpunkt ungefähr') : null),
      el('div', { style: 'display:grid;gap:8px;margin-top:14px' },
        el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => starteNavi(o) }, ic('route'), 'Hinführen'),
        null),
      el('div', { class: 'aktionen' },
        aktion('fav', 'herz', m.fav ? 'Gemerkt' : 'Merken', m.fav, () => { markiere(o.id, { fav: !m.fav }); zeichne({ scroll: true }); }),
        aktion('fertig', 'haken', 'Erledigt', m.fertig, () => { schalteErledigt(o); }),
        aktion('nur-voll', 'aus', 'Ausblenden', m.aus, () => {
          markiere(o.id, { aus: !m.aus });
          if (!m.aus) { schliesseOrt(); toast(`${o.name} ausgeblendet.`, { aktion: 'Rückgängig', fn: () => { markiere(o.id, { aus: false }); zeichne(); } }); } else zeichne({ scroll: true });
        }),
        aktion('nur-voll', 'teilen', 'Teilen', null, () => teile(o))),
      stimmBlock(o),
      o.notiz ? el('section', { class: 'abschnitt' }, el('h3', {}, o.kategorie === 'Foto' ? 'Foto-Tipp' : 'Unser Tipp'), el('p', { style: 'margin:0' }, notizText(o)),
        el('p', { class: 'quelle', style: 'margin-top:4px' }, /Quelle|abgerufen|[Ll]aut /.test(o.notiz) ? 'Preise und Zeiten können sich ändern.' : `Stand ${STAND_NOTIZEN}. Preise und Zeiten können sich ändern.`)) : null,
      o.foto ? el('section', { class: 'abschnitt' }, el('h3', {}, el('span', { class: 'marker g-foto', style: 'width:28px;height:28px;display:inline-grid;vertical-align:middle;margin-right:8px' }, symbol({ typ: 'foto' })), 'Foto-Tipp'), el('p', { style: 'margin:0' }, o.foto)) : null,
      o.dauer ? el('section', { class: 'abschnitt' }, el('h3', {}, 'Zeitbedarf'), el('p', { style: 'margin:0' }, el('strong', {}, `Etwa ${o.dauer} Minuten`)),
        el('p', { class: 'quelle', style: 'margin-top:4px' }, `Quelle: ${o.dauerQuelle || 'nicht angegeben'}.`)) : null,
      o.infos && o.infos.oeffnungszeiten ? el('section', { class: 'abschnitt' }, el('h3', {}, 'Öffnungszeiten'),
        st ? el('p', { style: 'margin:0' }, el('span', { class: 'status ' + (st.offen ? 'offen' : 'zu') }, st.offen ? `Jetzt geöffnet, bis ${st.bis} Uhr` : 'Jetzt geschlossen'), !st.offen && st.naechste ? `. Öffnet ${st.naechste} Uhr.` : '') : null,
        wochen ? el('ul', { class: 'zeiten' }, wochen.map((w) => el('li', { class: w.heute ? 'heute' : '' }, el('b', {}, w.tag), w.text)))
          : el('p', { style: 'margin:0' }, window.Oeffnung.roh(o.infos.oeffnungszeiten)),
        el('p', { class: 'quelle', style: 'margin-top:6px' }, `Laut OpenStreetMap${o.stand ? `, abgerufen am ${datumDe(o.stand)}` : ''}. Kann veraltet sein.`)) : null,
      o.wiki ? el('section', { class: 'abschnitt wiki' }, el('h3', {}, 'Über den Ort'),
        o.wiki.text.split('\n').filter(Boolean).slice(0, 3).map((p) => el('p', {}, p)),
        el('a', { href: o.wiki.url, target: '_blank', rel: 'noopener' }, `Weiterlesen auf Wikipedia${o.wiki.lang !== 'de' ? (o.wiki.lang === 'pt' ? ' (portugiesisch)' : ' (englisch)') : ''}`),
        o.stand ? el('p', { class: 'quelle', style: 'margin-top:4px' }, `Text abgerufen am ${datumDe(o.stand)}.`) : null) : null,
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Infos'),
        el('dl', { class: 'infos' },
          info('Adresse', el('span', {}, o.adresse, ' ', el('button', { type: 'button', class: 'knopf flach', style: 'min-height:44px;padding:0 8px', onclick: () => kopiere(o.adresse, 'Adresse kopiert.') }, ic('kopie'), 'Kopieren'))),
          info('Webseite', o.infos && o.infos.webseite ? el('a', { href: o.infos.webseite, target: '_blank', rel: 'noopener' }, o.infos.webseite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) : null),
          info('Telefon', o.infos && o.infos.telefon ? el('a', { href: 'tel:' + o.infos.telefon.replace(/[^+\d]/g, '') }, o.infos.telefon) : null),
          info('Küche', [kueche, veg].filter(Boolean).join(', ') || null),
          info('Zugang', rollstuhl))),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Meine Notiz'), notiz, gespeichert),
      el('section', { class: 'abschnitt nur-voll' }, el('h3', {}, 'Meine Bewertung'),
        el('div', { class: 'sterne', role: 'group', 'aria-label': 'Bewertung' }, [1, 2, 3, 4, 5].map((n) => el('button', {
          type: 'button', 'aria-pressed': String((m.sterne || 0) >= n), 'aria-label': `${n} von 5 Sternen`,
          onclick: () => { markiere(o.id, { sterne: m.sterne === n ? 0 : n }); zeichne({ scroll: true }); },
        }, ic('stern'))))),
      el('p', { class: 'quelle' }, 'Daten: OpenStreetMap', o.wiki ? ', Wikipedia' : '', o.bild ? ', Wikimedia Commons' : '', '.'));
  }

  function teile(o) {
    const url = location.href.split('#')[0] + '#ort-' + o.id;
    if (navigator.share) navigator.share({ title: o.name, text: `${o.name}, ${o.adresse}`, url }).catch(() => {});
    else kopiere(url, 'Link kopiert.');
  }
  function kopiere(text, meldung) {
    const ok = () => toast(meldung);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => toast(text));
    else toast(text);
  }


  // ---------- Navigation in der App ----------
  // Route: Valhalla der FOSSGIS e.V. (valhalla1.openstreetmap.de), so wie openstreetmap.org sie nutzt
  // (openstreetmap-website: config/settings.yml, engines/fossgis_valhalla.js). Regeln: höchstens 1 Anfrage/s, Namensnennung.
  // Felder laut Valhalla-Doku (docs/api/route/api-reference.md): maneuvers[].type/instruction/verbal_pre_transition_instruction/
  // begin_shape_index/length (km); shape = Polyline mit 6 Nachkommastellen; pedestrian: walking_speed, use_hills, step_penalty.
  const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
  const PFEIL = {
    gerade: '<path d="M12 20V5M6 11l6-6 6 6"/>', rechts: '<path d="M6 20v-7a4 4 0 0 1 4-4h9M14 4l5 5-5 5"/>',
    links: '<path d="M18 20v-7a4 4 0 0 0-4-4H5M10 4 5 9l5 5"/>', leichtRechts: '<path d="M8 20v-6l9-9M11 5h6v6"/>',
    leichtLinks: '<path d="M16 20v-6L7 5M13 5H7v6"/>', wenden: '<path d="M8 20V9a4 4 0 0 1 8 0v4M13 10l3 3 3-3"/>',
    ziel: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>', kreisel: '<circle cx="12" cy="9" r="4"/><path d="M12 13v8"/>',
    faehre: '<path d="M3 17c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M5 14l1.5-5h11L19 14M12 9V4"/>',
  };
  const TYP_PFEIL = (t) => ({ 4: 'ziel', 5: 'ziel', 6: 'ziel', 9: 'leichtRechts', 10: 'rechts', 11: 'rechts', 12: 'wenden', 13: 'wenden', 14: 'links', 15: 'links', 16: 'leichtLinks',
    18: 'rechts', 19: 'links', 20: 'rechts', 21: 'links', 23: 'leichtRechts', 24: 'leichtLinks', 26: 'kreisel', 27: 'kreisel', 28: 'faehre' }[t] || 'gerade');
  const N = { aktiv: false, ziel: null, route: null, cum: null, idx: 0, abseit: null, letzte: 0, gesagt: new Set(), linie: null, sperre: null, angekommen: false };

  function polyline(str, prec = 6) {
    const f = 10 ** prec, out = [];
    let i = 0, lat = 0, lon = 0;
    while (i < str.length) {
      for (const k of [0, 1]) {
        let b, s = 0, r = 0;
        do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
        const d = r & 1 ? ~(r >> 1) : r >> 1;
        if (k === 0) lat += d; else lon += d;
      }
      out.push([lat / f, lon / f]);
    }
    return out;
  }
  const xy = (p, ref) => [(p[1] - ref[1]) * 111320 * Math.cos(ref[0] * Math.PI / 180), (p[0] - ref[0]) * 110540];

  async function holeRoute(von, ziel, mitOptionen = true) {
    const fuss = { walking_speed: E.tempo === 'gemuetlich' ? 4 : 5.1 };
    if (E.steigung) Object.assign(fuss, { use_hills: 0.1, step_penalty: 60 });
    const body = { locations: [{ lat: von.lat, lon: von.lon, radius: 10 }, { lat: ziel.lat, lon: ziel.lon, radius: 10 }], costing: 'pedestrian',
      directions_options: { units: 'km', language: 'de-DE' } };
    if (mitOptionen) body.costing_options = { pedestrian: fuss };
    const warte = N.letzte + 1100 - Date.now();
    if (warte > 0) await new Promise((r) => setTimeout(r, warte));
    N.letzte = Date.now();
    const r = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(body))}`);
    const d = await r.json().catch(() => ({}));
    if (!d.trip || d.trip.status !== 0) {
      if (mitOptionen) return holeRoute(von, ziel, false);
      throw new Error(d.error || 'keine Route');
    }
    const leg = d.trip.legs[0];
    const pts = polyline(leg.shape, 6);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + meter({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] }));
    return {
      pts, cum, laenge: cum[cum.length - 1], zeit: leg.summary.time,
      schritte: leg.maneuvers.map((m) => ({ typ: m.type, text: m.instruction, sag: m.verbal_pre_transition_instruction || m.instruction, start: m.begin_shape_index, laenge: (m.length || 0) * 1000 })),
    };
  }

  function sage(text) {
    if (!E.ansage || !text || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.rate = E.profil === 'standard' ? 1 : 0.9;
      const v = speechSynthesis.getVoices().find((x) => /^de/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* ohne Ansage weiter */ }
  }
  async function wachHalten(an) {
    try {
      if (an && 'wakeLock' in navigator && !N.sperre) { N.sperre = await navigator.wakeLock.request('screen'); N.sperre.addEventListener('release', () => { N.sperre = null; }); }
      if (!an && N.sperre) { await N.sperre.release(); N.sperre = null; }
    } catch (e) { /* Gerät erlaubt es nicht: dann bleibt das Display nach System-Einstellung */ }
  }
  document.addEventListener('visibilitychange', () => { if (N.aktiv && document.visibilityState === 'visible') wachHalten(true); });

  function vorStart(o) {
    // Weite Ziele: zu Fuß ist Unsinn, Bahn oder Fähre vorschlagen
    const d = S.me && hatPos(o) ? meter(S.me, o) : null;
    if (d != null && d > 4000) {
      const nahMetro = ORTE.filter((x) => x.typ === 'metro' && hatPos(x)).sort((a, b) => meter(S.me, a) - meter(S.me, b))[0];
      const weg = o.ort === 'Cascais' ? { ziel: NACH_NAME.get('Bahnhof Cais do Sodré'), text: 'Das ist zu Fuß zu weit. Nach Cascais fährt der Zug ab Bahnhof Cais do Sodré.' }
        : o.ort === 'Almada' ? { ziel: NACH_NAME.get('Fähre Cais do Sodré'), text: 'Das ist zu Fuß zu weit und liegt auf der anderen Seite des Tejo. Die Fähre fährt ab Cais do Sodré nach Cacilhas.' }
          : { ziel: nahMetro, text: `Das ist zu Fuß zu weit. Mit der Metro geht es besser.${/Metro/.test(o.notiz || '') ? ` Tipp zum Ort: ${notizText(o)}.` : ''}` };
      setze($('#ansicht'), el('button', { type: 'button', class: 'knopf flach zurueck', onclick: () => zeichne() }, ic('zurueck'), 'Zurück'),
        el('h2', { class: 'ort-titel' }, `${strecke(d)} bis ${o.name}`),
        el('p', {}, weg.text),
        el('div', { style: 'display:grid;gap:8px' },
          weg.ziel ? el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => starteNavi(weg.ziel, true) }, ic('route'), `Zu ${weg.ziel.name} führen`) : null,
          el('button', { type: 'button', class: 'knopf breit', onclick: () => starteNavi(o, true) }, 'Trotzdem zu Fuß führen')));
      hoehe('mitte');
      return;
    }
    starteNavi(o, true);
  }

  async function starteNavi(o, bestaetigt) {
    if (!hatPos(o)) { toast('Für diesen Ort fehlt der Kartenpunkt.'); return; }
    if (!bestaetigt) { vorStart(o); return; }
    Object.assign(N, { aktiv: true, ziel: o, route: null, idx: 0, abseit: null, gesagt: new Set(), angekommen: false, luft: false });
    document.body.dataset.navi = 'an';
    S.ort = null; S.follow = true;
    if (E.ansage && 'speechSynthesis' in window) { try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* iOS: Ton im Tipp freischalten */ } }
    wachHalten(true);
    naviPanel('Suche deinen Standort …');
    if (S.watchId == null) starteGps(true);
    if (S.me) await neueRoute();
  }

  async function neueRoute() {
    if (!N.aktiv || !S.me) return;
    naviPanel(N.route ? 'Neue Route …' : 'Route wird berechnet …');
    try {
      N.route = await holeRoute(S.me, N.ziel);
      N.idx = 0; N.abseit = null; N.gesagt = new Set(); N.luft = false;
      zeichneRoute();
      naviUpdate(true);
      sage(N.route.schritte[0] && N.route.schritte[0].sag);
    } catch (e) {
      N.luft = true;
      zeichneLuftlinie();
      naviUpdate(true);
    }
  }

  function zeichneRoute() {
    if (!karte || !N.route) return;
    if (N.linie) N.linie.remove();
    N.linie = L.layerGroup([
      L.polyline(N.route.pts, { color: '#ffffff', weight: 11, opacity: 0.9, interactive: false }),
      L.polyline(N.route.pts, { className: 'navi-linie', color: '#1A73E8', weight: 7, opacity: 1, interactive: false }),
    ]).addTo(karte);
    karteZeichnen();
  }

  const RICHTUNG = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  function peilung(a, b) {
    const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
    const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function zeichneLuftlinie() {
    if (!karte || !S.me) return;
    if (N.linie) N.linie.remove();
    N.linie = L.layerGroup([L.polyline([[S.me.lat, S.me.lon], [N.ziel.lat, N.ziel.lon]], { color: '#1A73E8', weight: 5, dashArray: '2 10', lineCap: 'round', interactive: false })]).addTo(karte);
  }
  // Ohne Route vom Server: gerade Linie, Entfernung und Himmelsrichtung, bis die Route wieder geht
  function luftUpdate() {
    const d = meter(S.me, N.ziel);
    if (!N.angekommen && d < 25) { angekommen(); return; }
    zeichneLuftlinie();
    const richtung = RICHTUNG[Math.round(peilung(S.me, N.ziel) / 45) % 8];
    setze($('#navi-oben'), el('div', { class: 'pfeil', html: `<svg viewBox="0 0 24 24" aria-hidden="true">${PFEIL.gerade}</svg>` }),
      el('div', { class: 'navi-text' }, el('strong', {}, `${strecke(d)} Luftlinie`), el('span', {}, `Ziel liegt im ${richtung}. Die Fußroute lädt gerade nicht.`)));
    $('#navi-oben').hidden = false;
    const tempo = (E.tempo === 'gemuetlich' ? 4 : 5.1) / 3.6;
    naviPanel(null, false, { rest: d * 1.3, an: new Date(Date.now() + ((d * 1.3) / tempo) * 1000), luft: true });
    if (Date.now() - N.letzte > 30000) neueRoute();
  }
  function naviUpdate(neu) {
    if (N.aktiv && N.luft && !N.route && S.me) { luftUpdate(); return; }
    if (!N.aktiv || !N.route || !S.me) return;
    const R = N.route, ref = [S.me.lat, S.me.lon], p = [0, 0];
    let best = { d: Infinity, along: 0, i: 0 };
    for (let i = 0; i < R.pts.length - 1; i++) {
      const a = xy(R.pts[i], ref), b = xy(R.pts[i + 1], ref);
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
      const d = Math.hypot(a[0] + t * dx, a[1] + t * dy);
      if (d < best.d) best = { d, along: R.cum[i] + t * (R.cum[i + 1] - R.cum[i]), i };
    }
    const rest = Math.max(0, R.laenge - best.along);
    const zumZiel = meter(S.me, N.ziel);
    if (!N.angekommen && (rest < 20 || zumZiel < 25)) { angekommen(); return; }
    // Abseits der Route? Nach 12 s neu berechnen, höchstens alle 20 s
    const toleranz = Math.max(30, Math.min(S.me.acc || 0, 60));
    if (best.d > toleranz) { N.abseit = N.abseit || Date.now(); if (Date.now() - N.abseit > 12000 && Date.now() - N.letzte > 20000) { neueRoute(); return; } }
    else N.abseit = null;
    let k = R.schritte.findIndex((s) => R.cum[Math.min(s.start, R.cum.length - 1)] > best.along + 3);
    if (k < 0) k = R.schritte.length - 1;
    N.idx = k;
    const s = R.schritte[k];
    const bis = Math.max(0, R.cum[Math.min(s.start, R.cum.length - 1)] - best.along);
    if (bis <= 60 && !N.gesagt.has(k)) { N.gesagt.add(k); sage(s.sag); }
    const tempo = (E.tempo === 'gemuetlich' ? 4 : 5.1) / 3.6;
    const an = new Date(Date.now() + (rest / tempo) * 1000);
    setze($('#navi-oben'),
      el('div', { class: 'pfeil', html: `<svg viewBox="0 0 24 24" aria-hidden="true">${PFEIL[TYP_PFEIL(s.typ)]}</svg>` }),
      el('div', { class: 'navi-text' }, el('strong', {}, best.d > toleranz ? 'Abseits der Route' : `In ${strecke(bis)}`), el('span', {}, s.text)));
    $('#navi-oben').hidden = false;
    naviPanel(null, false, { rest, an, ab: best.d > toleranz });
    if (karte && S.follow) karte.panTo([S.me.lat, S.me.lon], { animate: !neu });
  }

  function naviPanel(meldung, fehler, info) {
    const box = $('#navi-unten');
    box.hidden = false;
    const beenden = el('button', { type: 'button', class: 'knopf warn', onclick: beendeNavi }, ic('x'), 'Beenden');
    const ansage = el('button', { type: 'button', class: 'knopf', 'aria-pressed': String(!!E.ansage), onclick: () => { E.ansage = !E.ansage; speichereE(); if (!E.ansage && 'speechSynthesis' in window) speechSynthesis.cancel(); naviPanel(meldung, fehler, info); } },
      ic(E.ansage ? 'ton' : 'tonAus'), E.ansage ? 'Ansage an' : 'Ansage aus');
    const kopf = el('div', { class: 'navi-kopf' },
      el('span', { class: 'marker g-' + gruppeVon(N.ziel.kategorie) }, symbol(N.ziel)),
      el('div', { class: 'was' }, el('small', {}, 'Navigation zu'), el('strong', {}, N.ziel.name)));
    if (meldung) {
      setze(box, kopf, el('p', { style: 'margin:6px 0 10px', class: fehler ? 'status zu' : 'leise' }, meldung),
        fehler ? el('div', { class: 'reihe' }, el('button', { type: 'button', class: 'knopf', onclick: neueRoute }, 'Nochmal')) : null,
        el('div', { class: 'reihe', style: 'margin-top:8px' }, beenden));
      return;
    }
    const schritte = el('ol', { class: 'schritte', hidden: !N.zeigeSchritte }, (N.route ? N.route.schritte : []).map((s, i) => el('li', { class: i === N.idx ? 'jetzt' : i < N.idx ? 'vorbei' : '' },
      el('span', { class: 'pfeil klein', html: `<svg viewBox="0 0 24 24" aria-hidden="true">${PFEIL[TYP_PFEIL(s.typ)]}</svg>` }), el('span', {}, s.text, s.laenge ? el('small', {}, ` · ${strecke(s.laenge)}`) : null))));
    setze(box, kopf,
      el('div', { class: 'navi-info' },
        el('strong', {}, `${Math.max(1, Math.round(info.rest / ((E.tempo === 'gemuetlich' ? 4 : 5.1) / 0.06)))} Min.`),
        el('span', {}, `${strecke(info.rest)} · Ankunft ${String(info.an.getHours()).padStart(2, '0')}:${String(info.an.getMinutes()).padStart(2, '0')}`)),
      el('div', { class: 'reihe' }, ansage,
        el('button', { type: 'button', class: 'knopf', 'aria-expanded': String(!!N.zeigeSchritte), onclick: () => { N.zeigeSchritte = !N.zeigeSchritte; naviPanel(null, false, info); } }, ic('plan'), 'Schritte'),
        beenden),
      schritte,
      el('p', { class: 'quelle' }, 'Route: ', el('a', { href: 'https://valhalla.openstreetmap.de/', target: '_blank', rel: 'noopener' }, 'Valhalla (FOSSGIS)'),
        ' · Daten © OpenStreetMap · ', el('a', { href: 'https://www.openstreetmap.org/fixthemap', target: '_blank', rel: 'noopener' }, 'Kartenfehler melden')));
    masseNavi();
  }
  function masseNavi() { requestAnimationFrame(() => document.documentElement.style.setProperty('--navi-h', `${$('#navi-unten').offsetHeight}px`)); }

  function angekommen() {
    N.angekommen = true;
    sage(`Du bist angekommen: ${N.ziel.name}.`);
    $('#navi-oben').hidden = true;
    const o = N.ziel;
    const naechster = S.tab === 'plan' ? planStopps().find(({ o: x }) => x.id !== o.id && !mk(x.id).fertig) : null;
    setze($('#navi-unten'),
      el('div', { class: 'leer', style: 'padding:6px 0' }, fasan(), el('strong', { style: 'font-size:var(--fs-t)' }, `Angekommen: ${o.name}`)),
      el('div', { style: 'display:grid;gap:8px' },
        naechster ? el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => { markiere(o.id, { fertig: true }); beendeNavi(); starteNavi(naechster.o); } },
          ic('haken'), `Erledigt, weiter zu ${naechster.o.name}`) : el('button', { type: 'button', class: 'knopf haupt breit', onclick: () => { markiere(o.id, { fertig: true }); beendeNavi(); } }, ic('haken'), 'Als erledigt markieren'),
        el('button', { type: 'button', class: 'knopf breit', onclick: () => { beendeNavi(); oeffneOrt(o.id); } }, 'Ort ansehen'),
        el('button', { type: 'button', class: 'knopf flach breit', onclick: beendeNavi }, 'Beenden')));
    masseNavi();
  }

  function beendeNavi() {
    Object.assign(N, { aktiv: false, route: null, angekommen: false, zeigeSchritte: false });
    if (N.linie) { N.linie.remove(); N.linie = null; }
    $('#navi-oben').hidden = true; $('#navi-unten').hidden = true;
    delete document.body.dataset.navi;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    wachHalten(false);
    hoehe(S.hoehe); zeichne({ anpassen: true });
  }


  // ---------- Einführung beim ersten Start ----------
  // Kurz (6 Karten), jederzeit überspringbar, unter „Mehr“ wieder abrufbar. Der Fasan tritt hier auf (ruhiger Bereich).
  function zeigeEinfuehrung(seite = 0) {
    const box = $('#einfuehrung');
    const leiste = [['plan', 'Tagesplan', 'Euer Tag, Stopp für Stopp'], ['orte', 'Orte', 'Alle Orte suchen und filtern'], ['gruppe', 'Gruppe', 'Abstimmen, Treffpunkt, Umfragen'],
      ['herz', 'Gemerkt', 'Deine Favoriten und Notizen'], ['mehr', 'Mehr', 'Größe, Aussehen, Tipps']];
    const legende = [['restaurant', 'g-essen', 'Restaurant'], ['restaurant', 'g-veggie', 'Vegetarisch'], ['cafe', 'g-essen', 'Café'], ['bar', 'g-abends', 'Bar'],
      ['fado', 'g-abends', 'Fado'], ['museum', 'g-sehen', 'Museum'], ['kirche', 'g-sehen', 'Kirche'], ['aussicht', 'g-aussicht', 'Aussicht'],
      ['park', 'g-sehen', 'Park'], ['markt', 'g-sehen', 'Markt'], ['metro', 'g-verkehr', 'Metro'], ['tram', 'g-verkehr', 'Tram'],
      ['aufzug', 'g-verkehr', 'Aufzug'], ['faehre', 'g-verkehr', 'Fähre'], ['shop', 'g-shoppen', 'Shoppen'], ['foto', 'g-foto', 'Foto-Spot (Filter „Foto“)'], ['treff', 'treff', 'Treffpunkt']];
    const seiten = [
      { titel: 'Willkommen in Lissabon', text: 'Diese Karte zeigt eure Tagespläne und alle Orte. Sie führt euch zu Fuß hin. Ohne Konto, ohne Werbung.', bild: () => fasan('einf-fasan') },
      { titel: 'Unten ist alles', text: 'Fünf Bereiche, immer im Daumenbereich:', bild: () => el('ul', { class: 'einf-liste' }, leiste.map(([i, n, t]) => el('li', {}, el('span', { class: 'einf-icon' }, ic(i)), el('span', {}, el('strong', {}, n), el('small', {}, t))))) },
      { titel: 'Tippen, losgehen', text: 'Beim nächsten Stopp auf „Hinführen“ tippen. Die Karte zeigt den Weg, sagt jede Abbiegung an und lässt das Display an. Am Ziel hakst du den Stopp ab.',
        bild: () => el('div', { class: 'einf-navi' }, el('span', { html: `<svg viewBox="0 0 24 24" aria-hidden="true">${PFEIL.rechts}</svg>` }), el('span', {}, el('strong', {}, 'In 120 m'), el('small', {}, 'Rechts abbiegen auf Rua da Rosa'))) },
      { titel: 'Die Symbole', text: 'Das Symbol zeigt, was ein Ort ist. Die Farbe zeigt die Art: Rot Essen, Grün vegetarisch, Blau Sehen, Orange Aussicht, Lila Abends, Ocker Verkehr, Pink Shoppen, Indigo Foto-Spots (erscheinen nur mit dem Filter „Foto“).',
        bild: () => el('div', { class: 'einf-legende' }, legende.map(([typ, g, n]) => el('span', {}, el('span', { class: `marker ${g}` }, symbol({ typ, kategorie: '' })), n))) },
      { titel: 'Gemeinsam entscheiden', text: 'Bei jedem Ort „Will hin“ oder „Lieber nicht“. Unter „Gruppe“ zeigst du deinen QR-Code; die anderen scannen ihn mit der Kamera. Aus euren Stimmen entsteht der Gruppenplan.',
        bild: () => el('div', { class: 'segmente stimme', style: 'width:100%' }, el('button', { type: 'button', class: 'ja', 'aria-pressed': 'true', tabindex: '-1' }, ic('hoch'), 'Will hin'), el('button', { type: 'button', class: 'nein', tabindex: '-1' }, ic('runter'), 'Lieber nicht')) },
      { titel: 'Wie groß soll alles sein?', text: 'Das kannst du später unter „Mehr“ ändern.',
        bild: () => el('div', { style: 'display:grid;gap:10px;width:100%' }, wahl(PROFILE, E.profil, (id) => { E.profil = id; speichereE(); wendeAn(); zeigeEinfuehrung(5); }),
          el('button', { type: 'button', class: 'knopf breit', onclick: () => starteGps(false) }, ic('standort'), S.watchId != null ? 'Standort ist freigegeben' : 'Standort freigeben')) },
    ];
    const ende = () => { box.hidden = true; speicher.set('einfuehrung', true); hoehe(S.hoehe); zeichne({ anpassen: true }); };
    const s = seiten[seite];
    setze(box, el('div', { class: 'einf-karte', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'einf-titel' },
      el('div', { class: 'einf-oben' }, el('span', { class: 'leise klein' }, `${seite + 1} von ${seiten.length}`),
        seite < seiten.length - 1 ? el('button', { type: 'button', class: 'knopf flach', onclick: ende }, 'Überspringen') : null),
      el('div', { class: 'einf-inhalt' }, s.bild(), el('h2', { id: 'einf-titel' }, s.titel), el('p', {}, s.text)),
      el('div', { class: 'einf-punkte', 'aria-hidden': 'true' }, seiten.map((_, i) => el('span', { class: i === seite ? 'an' : '' }))),
      el('div', { class: 'reihe einf-knoepfe' },
        seite ? el('button', { type: 'button', class: 'knopf', onclick: () => zeigeEinfuehrung(seite - 1) }, 'Zurück') : null,
        el('button', { type: 'button', class: 'knopf haupt', onclick: () => (seite < seiten.length - 1 ? zeigeEinfuehrung(seite + 1) : ende()) }, seite < seiten.length - 1 ? 'Weiter' : 'Los geht’s'))));
    box.hidden = false;
    const f = box.querySelector('.knopf.haupt'); if (f) f.focus({ preventScroll: true });
  }
  // Wischen als Zwilling der Knöpfe
  let einfX = null;
  document.addEventListener('touchstart', (e) => { einfX = e.target.closest('#einfuehrung') ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (einfX == null) return;
    const dx = e.changedTouches[0].clientX - einfX; einfX = null;
    const t = $('#einfuehrung .einf-oben .leise');
    if (!t || Math.abs(dx) < 60) return;
    const i = parseInt(t.textContent, 10) - 1;
    if (dx < 0 && i < 5) zeigeEinfuehrung(i + 1); else if (dx > 0 && i > 0) zeigeEinfuehrung(i - 1);
  }, { passive: true });

  // ---------- Standort ----------
  function gpsKnopf() {
    const b = $('#btn-standort');
    b.dataset.zustand = S.watchId == null ? 'aus' : !S.me ? 'sucht' : S.follow ? 'folgt' : 'an';
    b.setAttribute('aria-label', S.follow ? 'Karte folgt deinem Standort' : 'Mein Standort');
  }
  function zeichneIch() {
    if (!karte || !S.me) return;
    const p = [S.me.lat, S.me.lon];
    if (!ichKreis) ichKreis = L.circle(p, { radius: S.me.acc, className: 'ich-genau', interactive: false }).addTo(karte);
    if (!ichPunkt) ichPunkt = L.circleMarker(p, { radius: 9, weight: 3, className: 'ich', fillOpacity: 1, interactive: false }).addTo(karte);
    ichKreis.setLatLng(p).setRadius(S.me.acc);
    ichPunkt.setLatLng(p);
  }
  function starteGps(folgen = true) {
    if (!('geolocation' in navigator)) { toast('Dieses Gerät gibt keinen Standort heraus.'); return; }
    if (S.watchId != null) { if (folgen && S.me) { S.follow = true; zeigeAufKarte(S.me); gpsKnopf(); } return; }
    // Erster Tipp: Standort zeigen und Plan sichtbar lassen. Zweiter Tipp: Karte folgt dir.
    S.follow = N.aktiv && folgen;
    S.watchId = navigator.geolocation.watchPosition(aufPosition, aufFehler, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
    gpsKnopf();
  }
  function aufPosition(p) {
    const neu = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.min(p.coords.accuracy || 0, 2000) };
    const erst = !S.me;
    S.me = neu;
    zeichneIch();
    if (teileOrt()) funkOrt(neu);
    if (karte && erst && !N.aktiv && !S.ort) karteZeichnen(true);
    else if (S.follow && karte) { if (erst) zeigeAufKarte(neu, 17); else karte.panTo([neu.lat, neu.lon], { animate: true }); }
    if (N.aktiv) { if (!N.route && !N.letzteVersuch) { N.letzteVersuch = Date.now(); neueRoute().finally(() => { N.letzteVersuch = 0; }); } else naviUpdate(); gpsKnopf(); return; }
    if (!S.meAlt || meter(S.meAlt, neu) > 40) { S.meAlt = neu; if (!S.ort) zeichne({ scroll: true, karte: false }); }
    gpsKnopf();
  }
  function aufFehler(e) {
    if (e.code === 1) {
      if (S.watchId != null) navigator.geolocation.clearWatch(S.watchId);
      S.watchId = null; S.follow = false;
      toast(IOS ? 'Standort gesperrt. iPhone: Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites → „Beim Verwenden“. Dann die Seite neu laden.'
        : 'Standort gesperrt. Chrome: links in der Adresszeile auf das Symbol tippen → Berechtigungen → Standort erlauben. Dann neu laden.', { aktion: 'Neu laden', fn: () => location.reload() });
    } else if (e.code === 3 && S.me) {
      /* kurze Funklöcher: letzte Position bleibt gültig */
    } else if (Date.now() - S.fehlerZeit > 60000) { S.fehlerZeit = Date.now(); toast('Standort gerade nicht verfügbar. Draußen klappt es meist besser.'); }
    gpsKnopf();
  }

  // ---------- Meldungen und Hilfe im Moment ----------
  let toastTimer = null;
  function toast(text, opt = {}) {
    const t = $('#toast');
    setze(t, el('span', {}, text), opt.aktion ? el('button', { type: 'button', onclick: () => { t.hidden = true; opt.fn(); } }, opt.aktion) : null);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, opt.aktion ? 6500 : 4000);
  }
  // Hilfe im Moment: ein kurzer Hinweis direkt am Element, nur beim ersten Mal (Fasan: Grossman & Fitzmaurice 2010)
  function hilfe(key, text) {
    if (speicher.get('hilfe:' + key, false)) return null;
    const box = el('div', { class: 'hilfe', role: 'note' }, el('span', {}, text));
    box.append(el('button', { type: 'button', class: 'knopf flach', onclick: () => { speicher.set('hilfe:' + key, true); box.remove(); } }, 'Verstanden'));
    return box;
  }

  // ---------- Bedienung ----------
  $$('#leiste [data-tab]').forEach((b) => b.addEventListener('click', () => {
    const neu = b.dataset.tab;
    if (S.ort) { S.ort = null; try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ } }
    if (neu === S.tab && S.hoehe !== 'klein') { $('#ansicht').scrollTop = 0; }
    S.tab = neu; speicher.set('tab', neu);
    if (neu === 'mehr' || neu === 'gemerkt' || neu === 'gruppe') hoehe('gross'); else if (S.hoehe === 'gross' && neu === 'plan') hoehe('mitte');
    zeichne({ anpassen: true });
  }));
  $('#griff').addEventListener('click', () => (S.hoehe === 'gross' ? hoehe('klein') : groesser()));
  // Wischen am Blattkopf: hoch = größer, runter = kleiner (sichtbarer Zwilling: der Griff)
  let startY = null;
  const zone = $('#blatt');
  zone.addEventListener('touchstart', (e) => {
    const inhalt = e.target.closest('.ansicht');
    startY = inhalt && inhalt.scrollTop > 0 ? null : e.touches[0].clientY;
  }, { passive: true });
  zone.addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    const imInhalt = e.target.closest('.ansicht');
    startY = null;
    if (dy < -45 && !imInhalt) groesser();
    else if (dy > 60) kleiner();
  }, { passive: true });

  const suche = $('#suche');
  suche.addEventListener('focus', () => { hoehe('gross'); if (S.tab !== 'orte') { S.tab = 'orte'; S.ort = null; zeichne(); } });
  suche.addEventListener('input', () => { S.suche = suche.value; $('#suche-leeren').hidden = !S.suche; if (S.ort) S.ort = null; if (S.tab !== 'orte') S.tab = 'orte'; zeichne({ anpassen: true }); });
  suche.addEventListener('keydown', (e) => { if (e.key === 'Enter') suche.blur(); });
  $('#suche-leeren').addEventListener('click', () => { suche.value = ''; S.suche = ''; $('#suche-leeren').hidden = true; zeichne({ anpassen: true }); suche.focus(); });
  $('#btn-standort').addEventListener('click', () => starteGps(true));
  addEventListener('resize', () => { hoehe(S.hoehe); if (karte) karte.invalidateSize(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.ort) schliesseOrt(); });

  // ---------- Start ----------
  wendeAn();
  hoehe('klein');
  gpsKnopf();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const lade = (u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  Promise.all([lade('orte.json'), lade('plaene.json')]).then(([orte, plaene]) => {
    ORTE = orte; PLAENE = plaene;
    ORTE.forEach((o) => { NACH_NAME.set(o.name, o); NACH_ID.set(o.id, o); });
    zeichne({ anpassen: true });
    if (!speicher.get('einfuehrung', false) && !/^#g=/.test(location.hash)) zeigeEinfuehrung(0);
    importiereAusHash();
    funkStart(); leisteZahl();
    if (E.teilenBis && !teileOrt()) { E.teilenBis = 0; speichereE(); }
    if (teileOrt()) { if (S.watchId == null) starteGps(false); setTimeout(() => toast(`Du teilst deinen Standort mit der Gruppe bis ${uhrzeit(E.teilenBis)}.`, { aktion: 'Beenden', fn: () => { teilenEnde(); zeichne({ scroll: true, karte: false }); } }), 1500); }
    fetch('wetter.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((w) => { if (w && (w.ipma || w.om)) { W = w; if (S.tab === 'plan' && !S.ort) zeichne({ scroll: true, karte: false }); } }).catch(() => {});
    const h = /^#ort-(.+)$/.exec(location.hash);
    if (h && NACH_ID.has(h[1])) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ } oeffneOrt(h[1]); }
    $('#laden').classList.add('weg');
    setTimeout(() => $('#laden').remove(), 400);
  }).catch(() => {
    setze($('#laden'), fasan(), el('b', {}, 'Die Orte konnten nicht geladen werden.'), el('button', { type: 'button', class: 'knopf haupt', onclick: () => location.reload() }, 'Neu laden'));
  });
})();
