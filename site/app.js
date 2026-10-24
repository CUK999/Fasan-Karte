'use strict';
/* Fasan Karte – Logik. Keine Konten, keine Statistik; Markierungen bleiben auf dem Gerät (localStorage). */
(() => {
  const VERSION = '1.1';
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
  };
  const GRUPPEN = [
    { id: 'sehen', label: 'Sehen', kats: ['Sehenswürdigkeit', 'Museum', 'Markt', 'Event'] },
    { id: 'aussicht', label: 'Aussicht', kats: ['Aussichtspunkt'] },
    { id: 'essen', label: 'Essen', kats: ['Essen für alle', 'Café'] },
    { id: 'veggie', label: 'Veggie', kats: ['Vegan portugiesisch', 'Vegetarisch'] },
    { id: 'abends', label: 'Abends', kats: ['Bar', 'Fado', 'Getränk'] },
    { id: 'verkehr', label: 'Verkehr', kats: ['Verkehr'] },
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
  const E = Object.assign({ profil: 'standard', theme: 'system', navi: IOS ? 'apple' : 'google', heim: '' }, speicher.get('einstellungen', {}));
  if (!IOS && E.navi === 'apple') E.navi = 'google';
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
  if (!['A', 'B', 'C'].includes(S.plan)) S.plan = 'A';
  if (!['plan', 'orte', 'gemerkt', 'mehr'].includes(S.tab)) S.tab = 'plan';

  let M = speicher.get('markierungen', {});
  const mk = (id) => M[id] || {};
  function markiere(id, patch) {
    const neu = Object.assign({}, mk(id), patch, { t: Date.now() });
    const leer = !neu.fav && !neu.fertig && !neu.aus && !neu.notiz && !neu.sterne;
    if (leer) delete M[id]; else M[id] = neu;
    speicher.set('markierungen', M);
  }

  let ORTE = [], NACH_NAME = new Map(), NACH_ID = new Map(), PLAENE = {};

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

  // ---------- Navigation an Karten-Apps übergeben ----------
  // Google Maps URLs: https://developers.google.com/maps/documentation/urls/guide (bis 9 Zwischenstopps)
  // Apple Maps: https://developer.apple.com/documentation/mapkit/unified-map-urls (iOS 18.4+)
  function zielText(o) {
    if (/[()]|\sund\s|^Tram |^Fähre /.test(o.name) || o.adresse.startsWith(o.name)) return o.adresse;
    return `${o.name}, ${o.adresse}`;
  }
  const NAVI_NAME = { apple: 'Apple Karten', google: 'Google Maps', geo: 'Karten-App' };
  function naviLink(o, app = E.navi) {
    const z = encodeURIComponent(zielText(o));
    if (app === 'apple') return `https://maps.apple.com/directions?mode=walking&destination=${z}`;
    if (app === 'geo' && hatPos(o)) return `geo:${o.lat},${o.lon}?q=${o.lat},${o.lon}(${encodeURIComponent(o.name)})`;
    return `https://www.google.com/maps/dir/?api=1&travelmode=walking&dir_action=navigate&destination=${z}`;
  }
  const textLink = (t, app = E.navi) => (app === 'apple'
    ? `https://maps.apple.com/directions?mode=walking&destination=${encodeURIComponent(t)}`
    : `https://www.google.com/maps/dir/?api=1&travelmode=walking&dir_action=navigate&destination=${encodeURIComponent(t)}`);
  function routenTeile(orte, app) {
    const max = 10, n = Math.ceil(orte.length / max) || 1, g = Math.ceil(orte.length / n), teile = [];
    for (let i = 0; i < orte.length; i += g) teile.push(orte.slice(i, i + g));
    return teile.map((t, i) => {
      const ziel = encodeURIComponent(zielText(t[t.length - 1]));
      const wp = t.slice(0, -1).map((o) => encodeURIComponent(zielText(o)));
      const href = app === 'apple'
        ? `https://maps.apple.com/directions?mode=walking&destination=${ziel}${wp.map((w) => '&waypoint=' + w).join('')}`
        : `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${ziel}${wp.length ? '&waypoints=' + wp.join('%7C') : ''}`;
      return { nr: i + 1, von: teile.length, href };
    });
  }
  const linkKnopf = (href, cls, ...kinder) => el('a', { class: 'knopf ' + (cls || ''), href, target: href.startsWith('geo:') ? null : '_blank', rel: 'noopener' }, ...kinder);

  // ---------- Daten ----------
  function schritte(plan = S.plan, tag = S.tag) {
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
      if (S.gruppen.size && !S.gruppen.has(gruppeVon(o.kategorie))) return false;
      if (S.extra.has('tipp') && !istTipp(o)) return false;
      if (S.extra.has('fav') && !m.fav) return false;
      if (S.extra.has('offen')) { const st = status(o); if (!st || !st.offen) return false; }
      if (S.extra.has('offenNicht') && m.fertig) return false;
      return true;
    });
  }
  function sortiert(liste) {
    const r = GRUPPEN.map((g) => g.id);
    if (S.sort === 'naehe' && S.me) return liste.slice().sort((a, b) => (hatPos(a) ? meter(S.me, a) : 1e9) - (hatPos(b) ? meter(S.me, b) : 1e9));
    return liste.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }

  // ---------- Karte ----------
  let karte = null, ebene = null, ichPunkt = null, ichKreis = null;
  const marker = new Map();
  if (window.L) {
    karte = L.map('karte', { zoomControl: false, attributionControl: true }).setView(LISSABON, 14);
    karte.attributionControl.setPosition('topright').setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(karte);
    ebene = L.layerGroup().addTo(karte);
    karte.on('dragstart', () => { if (S.follow) { S.follow = false; gpsKnopf(); } });
    karte.on('click', () => { if (S.ort) schliesseOrt(); else if (S.hoehe !== 'klein') hoehe('klein'); });
  }

  function punktIcon(o, nr, opt = {}) {
    const m = mk(o.id), g = gruppeVon(o.kategorie);
    const kl = ['punkt', 'g-' + g, nr ? 'nr' : '', m.fertig ? 'erledigt' : '', S.ort === o.id ? 'gewaehlt' : ''].filter(Boolean).join(' ');
    const innen = nr ? String(nr) : `<svg viewBox="0 0 24 24">${SVG[g]}</svg>`;
    const marke = m.fav ? `<span class="marke herz"><svg viewBox="0 0 24 24">${SVG.herz}</svg></span>`
      : istTipp(o) ? `<span class="marke tipp"><svg viewBox="0 0 24 24">${SVG.stern}</svg></span>` : '';
    return L.divIcon({ className: kl + (opt.alt ? ' alt' : ''), html: `<span class="p">${innen}</span>${marke}`, iconSize: [56, 56], iconAnchor: [28, 28] });
  }

  function karteZeichnen(anpassen) {
    if (!karte) return;
    ebene.clearLayers(); marker.clear();
    let orte = [], nummern = new Map(), linie = [];
    if (S.tab === 'plan') {
      for (const { o, nr, s } of planStopps()) {
        orte.push(o); nummern.set(o.id, nr);
        if (hatPos(o)) linie.push([o.lat, o.lon]);
        (s.alt || []).map((n) => NACH_NAME.get(n)).filter(Boolean).forEach((a) => { if (!orte.includes(a)) orte.push(a); });
      }
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
      const mm = L.marker([o.lat, o.lon], { icon: punktIcon(o, nr), title: o.name, alt: o.name, keyboard: true, riseOnHover: true, zIndexOffset: nr ? 400 : 0 })
        .on('click', (e) => { L.DomEvent.stopPropagation(e); oeffneOrt(o.id); })
        .addTo(ebene);
      marker.set(o.id, mm);
      punkte.push([o.lat, o.lon]);
    }
    if (anpassen && punkte.length && !S.follow && !S.ort) passeAn(punkte);
  }

  function blattPx() { return $('#blatt').getBoundingClientRect().height; }
  function passeAn(punkte) {
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
      : { klein: 262 + gross, mitte: Math.round(vh * 0.52), gross: vh - nav - 56 - (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0) }[h];
    document.documentElement.style.setProperty('--blatt-h', `${px}px`);
    document.body.dataset.blatt = h;
    $('#griff').setAttribute('aria-label', h === 'gross' ? 'Blatt verkleinern' : 'Blatt vergrößern');
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
    else zeichneMehr(box);
    box.scrollTop = scroll;
    if (opt.karte !== false) karteZeichnen(opt.anpassen);
  }

  function eintragOrt(o, opt = {}) {
    const m = mk(o.id), g = gruppeVon(o.kategorie), st = status(o);
    const unter = [o.kategorie];
    if (o.ort && o.ort !== 'Lisboa') unter.push(o.ort);
    if (S.me && hatPos(o)) { const d = meter(S.me, o); unter.push(`${strecke(d)} · ${gehzeit(d)} Min.`); }
    const offen = st ? el('span', { class: 'status ' + (st.offen ? 'offen' : 'zu') }, st.offen ? `offen bis ${st.bis}` : st.naechste ? `zu, öffnet ${st.naechste}` : 'geschlossen') : null;
    const zeichen = el('span', { class: 'zeichen' },
      m.fav ? ic('herz') : null, istTipp(o) ? ic('stern') : null, m.notiz ? ic('notiz') : null);
    zeichen.querySelectorAll('svg').forEach((s, i) => { s.style.fill = 'none'; s.style.stroke = 'currentColor'; s.style.strokeWidth = '2'; });
    const marker = el('span', { class: 'marker g-' + g }, opt.nr ? String(opt.nr) : ic(g));
    const li = el('li', { class: 'eintrag' + (m.fertig ? ' erledigt' : '') },
      el('button', { type: 'button', class: 'auf', onclick: () => oeffneOrt(o.id, true) },
        marker,
        el('span', { class: 'text' },
          el('span', { class: 'titel' }, opt.zeit ? el('span', { class: 'zeit' }, opt.zeit + ' ') : null, o.name, zeichen),
          opt.text ? el('span', { class: 'unter', style: 'color:var(--text);font-weight:600' }, opt.text) : null,
          el('span', { class: 'unter' }, unter.join(' · '), offen ? ' · ' : '', offen))),
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

  function zeichnePlan(box) {
    const plan = PLAENE[S.plan] || { titel: 'Plan ' + S.plan, untertitel: '' };
    const tag = TAGE.find((t) => t.id === S.tag);
    const stopps = planStopps();
    const fertig = stopps.filter(({ o }) => mk(o.id).fertig).length;
    const naechster = stopps.find(({ o }) => !mk(o.id).fertig);

    let zusammen;
    if (naechster) {
      const { o, s, nr } = naechster;
      const d = S.me && hatPos(o) ? meter(S.me, o) : null;
      zusammen = el('div', { class: 'zusammen' },
        el('div', { class: 'zeile' },
          el('span', { class: 'marker g-' + gruppeVon(o.kategorie) }, String(nr)),
          el('button', { type: 'button', class: 'was', style: 'border:0;background:none;text-align:left;padding:0;min-height:60px', onclick: () => oeffneOrt(o.id, true) },
            el('small', {}, `Nächster Stopp ${nr} von ${stopps.length}${s.zeit ? ` · ${s.zeit} Uhr` : ''}${d != null ? ` · ${gehzeit(d)} Min.` : ''}`),
            el('strong', {}, o.name))),
        linkKnopf(naviLink(o), 'haupt breit', ic('route'), 'Starten', el('span', { class: 'neben' }, NAVI_NAME[E.navi])),
        hilfe('starten', `„Starten“ öffnet ${NAVI_NAME[E.navi]} mit dem Fußweg dorthin. Bist du da, hake den Stopp unten in der Liste ab.`));
    } else {
      zusammen = el('div', { class: 'leer' }, fasan(), el('strong', {}, stopps.length ? 'Alles erledigt für heute.' : 'Für diesen Tag gibt es keine Stopps.'));
    }

    const tageSeg = el('div', { class: 'segmente', role: 'group', 'aria-label': 'Tag' },
      TAGE.map((t) => el('button', { type: 'button', 'aria-pressed': String(t.id === S.tag), onclick: () => { S.tag = t.id; speicher.set('tag', S.tag); zeichne({ anpassen: true }); } }, t.kurz)));
    const planSeg = el('div', { class: 'segmente nur-voll', role: 'group', 'aria-label': 'Plan' },
      ['A', 'B', 'C'].map((p) => el('button', { type: 'button', 'aria-pressed': String(p === S.plan), onclick: () => { S.plan = p; speicher.set('plan', p); zeichne({ anpassen: true }); } }, 'Plan ' + p)));

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
    const routen = stopps.length && E.navi !== 'geo'
      ? routenTeile(stopps.map(({ o }) => o), E.navi).map((t) => linkKnopf(t.href, '', ic('route'), `Ganze Tagesroute${t.von > 1 ? ` · Teil ${t.nr}/${t.von}` : ''}`))
      : [];
    setze(box,
      zusammen,
      el('div', { class: 'abschnitt', style: 'display:grid;gap:8px' }, tageSeg, planSeg),
      el('p', { class: 'leise klein', style: 'margin:12px 0 0' }, `${plan.titel}: ${plan.untertitel}. ${tag.lang}.`),
      stopps.length ? el('div', { class: 'fortschritt', style: 'margin-top:10px', 'aria-label': `${fertig} von ${stopps.length} erledigt` }, el('span', { style: `width:${(fertig / stopps.length) * 100}%` })) : null,
      el('div', { class: 'reihe', style: 'margin-top:12px' }, routen, heimKnopf()),
      liste);
  }

  function heimKnopf() {
    if (!E.heim) return null;
    return linkKnopf(textLink(E.heim, E.navi === 'geo' ? 'google' : E.navi), '', ic('haus'), 'Zur Unterkunft');
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
      ex('tipp', 'Geheimtipps', 'stern'), ex('offen', 'Jetzt offen'), ex('offenNicht', 'Noch nicht erledigt', 'haken'), ex('fav', 'Gemerkt', 'herz'), ex('aus', 'Ausgeblendete zeigen', 'aus'));
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
    const navis = [IOS ? ['apple', 'Apple Karten', 'Auf dem iPhone vorinstalliert.'] : null, ['google', 'Google Maps', 'Fußweg mit Sprachansage.'],
      ANDROID ? ['geo', 'Andere Karten-App', 'Zum Beispiel CoMaps oder OsmAnd. Zeigt den Ort, die Route startest du dort.'] : null].filter(Boolean);
    const heimFeld = el('input', { id: 'heim', type: 'text', value: E.heim, autocomplete: 'street-address', placeholder: 'Straße Hausnummer, Lisboa' });
    setze(box,
      el('div', { style: 'display:flex;align-items:center;gap:12px;padding-top:4px' }, fasan('klein-fasan'),
        el('div', {}, el('strong', { style: 'font-size:var(--fs-t)' }, 'Fasan Karte'), el('div', { class: 'leise klein' }, `Lissabon · Version ${VERSION}`))),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Profil'), wahl(PROFILE, E.profil, (id) => { E.profil = id; speichereE(); wendeAn(); hoehe(S.hoehe); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Aussehen'), wahl(THEMES, E.theme, (id) => { E.theme = id; speichereE(); wendeAn(); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Navigation mit'), wahl(navis, E.navi, (id) => { E.navi = id; speichereE(); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Plan'), wahl([['A', 'Plan A', 'Empfehlung: Klassiker mit Geheimtipps'], ['B', 'Plan B', 'Geheimtipps'], ['C', 'Plan C', 'Wenig Steigung']], S.plan, (id) => { S.plan = id; speicher.set('plan', id); zeichne({ scroll: true }); })),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Unterkunft'),
        el('p', { class: 'leise klein', style: 'margin:0 0 8px' }, 'Bleibt nur auf diesem Handy. Danach gibt es im Tagesplan „Zur Unterkunft“.'),
        el('div', { class: 'feld' }, heimFeld, el('button', { type: 'button', class: 'knopf', onclick: () => { E.heim = heimFeld.value.trim(); speichereE(); toast(E.heim ? 'Unterkunft gespeichert.' : 'Unterkunft entfernt.'); } }, 'Speichern'))),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Gut zu wissen in Lissabon'),
        tipps('Fahren', ['Pro Person eine navegante-Karte (0,50 €) am Metro-Automaten.', 'Einzelfahrt 1,90 €. 24-Stunden-Ticket 7,25 €, mit Fähre 10,35 €, mit Zug nach Cascais 11,40 €.', 'Beim Fahrer teurer: Tram 3,30 €, Bus 2,30 €.', 'Gesperrt: Elevador de Santa Justa sowie die Standseilbahnen Glória, Bica und Lavra. Der Funicular da Graça fährt 7–21 Uhr.']),
        tipps('Zeiten', ['Nacht auf Sonntag: Uhren 1 Stunde zurück.', 'Montag zu: Jerónimos und staatliche Museen. Dienstag zu: Gulbenkian.', 'Gulbenkian sonntags ab 14 Uhr gratis.', 'Reservieren: O Frade (So Mittag), Estrela da Bica (Mo Abend).']),
        tipps('Vor Ort', ['Couvert (Brot, Oliven, Häppchen) kostet extra. Ablehnen mit „Não, obrigado“. Oft ist Schinken dabei.', 'Trinkgeld 5–10 %. Bei Gruppen steht manchmal schon Service auf der Rechnung.', 'Taschendiebe in Tram 28 und 15E. Falsche Dealer in der Baixa ignorieren.', 'Bargeld am Multibanco-Automaten holen.']),
        tipps('Diese Karte', ['Nummern zeigen die Reihenfolge des Tages. Die gepunktete Linie ist Luftlinie; den Fußweg zeigt die Navigation.', 'Gehzeiten sind geschätzt: 1,3 × Luftlinie bei 4 km/h.', 'Öffnungszeiten stammen aus OpenStreetMap und können veraltet sein.', 'Zum Startbildschirm hinzufügen: im Browser-Menü „Zum Startbildschirm“. Dann startet die Karte wie eine App.'])),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Daten und Verbindungen'),
        el('ul', { class: 'klein', style: 'margin:0;padding-left:20px;display:grid;gap:6px' },
          el('li', {}, 'Keine Konten, keine Statistik, keine Werbung.'),
          el('li', {}, 'Markierungen, Notizen und Unterkunft bleiben auf diesem Handy.'),
          el('li', {}, 'Dein Standort wird nur im Browser verwendet und nicht gesendet.'),
          el('li', {}, 'Verbindungen: Kartenbilder von OpenStreetMap. Beim Antippen von Navigation, Webseite oder Wikipedia öffnet sich die jeweilige Seite.'))),
      el('section', { class: 'abschnitt' }, el('h3', {}, 'Quellen und Lizenzen'),
        el('p', { class: 'klein', style: 'margin:0' }, 'Karte und Orte: © OpenStreetMap-Mitwirkende (ODbL). Texte: Wikipedia (CC BY-SA). Fotos: Wikimedia Commons, Autor und Lizenz stehen unter jedem Bild. Karte: Leaflet (BSD-2). Diese App: MPL-2.0.')),
      el('section', { class: 'abschnitt nur-voll' }, el('h3', {}, 'Zurücksetzen'), el('div', { id: 'reset-box' },
        el('button', { type: 'button', class: 'knopf warn', onclick: () => setze($('#reset-box'),
          el('p', { style: 'margin:0 0 8px' }, 'Alle Markierungen, Notizen und Bewertungen auf diesem Handy löschen?'),
          el('div', { class: 'reihe' },
            el('button', { type: 'button', class: 'knopf', onclick: () => zeichne({ scroll: true }) }, 'Abbrechen'),
            el('button', { type: 'button', class: 'knopf warn', onclick: () => { M = {}; speicher.set('markierungen', M); toast('Alles gelöscht.'); zeichne(); } }, 'Ja, löschen'))) }, 'Markierungen löschen'))));
  }
  const tipps = (titel, punkte) => el('details', { class: 'tipps' }, el('summary', {}, titel), el('ul', {}, punkte.map((p) => el('li', {}, p))));

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
      el('h2', { class: 'ort-titel' }, o.name),
      el('div', { class: 'ort-unter' },
        el('span', { class: 'marker g-' + g, style: 'width:28px;height:28px' }, ic(g)), o.kategorie,
        o.ort && o.ort !== 'Lisboa' ? el('span', {}, '· ' + o.ort) : null,
        d != null ? el('span', {}, `· ${strecke(d)}, etwa ${gehzeit(d)} Min. zu Fuß`) : null),
      el('div', { class: 'reihe', style: 'margin-top:8px' },
        istTipp(o) ? el('span', { class: 'abzeichen tipp' }, ic('stern'), 'Geheimtipp') : null,
        plaene.map((p) => el('span', { class: 'abzeichen' }, p)),
        o.quelle === 'pruefen' ? el('span', { class: 'abzeichen warn' }, 'Kartenpunkt ungefähr') : null),
      el('div', { style: 'display:grid;gap:8px;margin-top:14px' },
        linkKnopf(naviLink(o), 'haupt breit', ic('route'), 'Route starten', el('span', { class: 'neben' }, NAVI_NAME[E.navi])),
        E.navi !== 'google' ? linkKnopf(naviLink(o, 'google'), 'breit', 'In Google Maps öffnen') : null),
      el('div', { class: 'aktionen' },
        aktion('fav', 'herz', m.fav ? 'Gemerkt' : 'Merken', m.fav, () => { markiere(o.id, { fav: !m.fav }); zeichne({ scroll: true }); }),
        aktion('fertig', 'haken', 'Erledigt', m.fertig, () => { schalteErledigt(o); }),
        aktion('nur-voll', 'aus', 'Ausblenden', m.aus, () => {
          markiere(o.id, { aus: !m.aus });
          if (!m.aus) { schliesseOrt(); toast(`${o.name} ausgeblendet.`, { aktion: 'Rückgängig', fn: () => { markiere(o.id, { aus: false }); zeichne(); } }); } else zeichne({ scroll: true });
        }),
        aktion('nur-voll', 'teilen', 'Teilen', null, () => teile(o))),
      o.bild ? el('figure', { class: 'bild', style: 'margin:16px 0 0' },
        el('img', { src: o.bild.src, alt: `Foto: ${o.name}`, loading: 'lazy', width: o.bild.breite, height: o.bild.hoehe }),
        el('figcaption', {}, 'Foto: ', o.bild.autor, ' · ', el('a', { href: o.bild.quelle, target: '_blank', rel: 'noopener' }, o.bild.lizenz))) : null,
      o.notiz ? el('section', { class: 'abschnitt' }, el('h3', {}, 'Unser Tipp'), el('p', { style: 'margin:0' }, notizText(o))) : null,
      o.infos && o.infos.oeffnungszeiten ? el('section', { class: 'abschnitt' }, el('h3', {}, 'Öffnungszeiten'),
        st ? el('p', { style: 'margin:0' }, el('span', { class: 'status ' + (st.offen ? 'offen' : 'zu') }, st.offen ? `Jetzt geöffnet, bis ${st.bis} Uhr` : 'Jetzt geschlossen'), !st.offen && st.naechste ? `. Öffnet ${st.naechste} Uhr.` : '') : null,
        wochen ? el('ul', { class: 'zeiten' }, wochen.map((w) => el('li', { class: w.heute ? 'heute' : '' }, el('b', {}, w.tag), w.text)))
          : el('p', { style: 'margin:0' }, window.Oeffnung.roh(o.infos.oeffnungszeiten)),
        el('p', { class: 'quelle', style: 'margin-top:6px' }, 'Laut OpenStreetMap, kann veraltet sein.')) : null,
      o.wiki ? el('section', { class: 'abschnitt wiki' }, el('h3', {}, 'Über den Ort'),
        o.wiki.text.split('\n').filter(Boolean).slice(0, 3).map((p) => el('p', {}, p)),
        el('a', { href: o.wiki.url, target: '_blank', rel: 'noopener' }, `Weiterlesen auf Wikipedia${o.wiki.lang !== 'de' ? (o.wiki.lang === 'pt' ? ' (portugiesisch)' : ' (englisch)') : ''}`)) : null,
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
    S.follow = folgen;
    S.watchId = navigator.geolocation.watchPosition(aufPosition, aufFehler, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
    gpsKnopf();
  }
  function aufPosition(p) {
    const neu = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.min(p.coords.accuracy || 0, 2000) };
    const erst = !S.me;
    S.me = neu;
    zeichneIch();
    if (S.follow && karte) { if (erst) zeigeAufKarte(neu, 16); else karte.panTo([neu.lat, neu.lon], { animate: true }); }
    if (!S.meAlt || meter(S.meAlt, neu) > 40) { S.meAlt = neu; if (!S.ort) zeichne({ scroll: true, karte: false }); }
    gpsKnopf();
  }
  function aufFehler(e) {
    if (e.code === 1) {
      if (S.watchId != null) navigator.geolocation.clearWatch(S.watchId);
      S.watchId = null; S.follow = false;
      toast('Standort nicht erlaubt. Gib ihn in den Browser-Einstellungen für diese Seite frei und lade neu.');
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
    if (neu === 'mehr' || neu === 'gemerkt') hoehe('gross'); else if (S.hoehe === 'gross' && neu === 'plan') hoehe('mitte');
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
    const h = /^#ort-(.+)$/.exec(location.hash);
    if (h && NACH_ID.has(h[1])) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ } oeffneOrt(h[1]); }
    $('#laden').classList.add('weg');
    setTimeout(() => $('#laden').remove(), 400);
  }).catch(() => {
    setze($('#laden'), fasan(), el('b', {}, 'Die Orte konnten nicht geladen werden.'), el('button', { type: 'button', class: 'knopf haupt', onclick: () => location.reload() }, 'Neu laden'));
  });
})();
