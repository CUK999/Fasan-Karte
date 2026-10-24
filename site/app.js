'use strict';
(() => {
  const TAGE = [
    { id: 'sa', kurz: 'Sa 24.10.', datum: '2026-10-24' },
    { id: 'so', kurz: 'So 25.10.', datum: '2026-10-25' },
    { id: 'mo', kurz: 'Mo 26.10.', datum: '2026-10-26' },
  ];
  const GRUPPEN = [
    { id: 'sehen', label: 'Sehen', kats: ['Sehenswürdigkeit', 'Museum', 'Markt', 'Event'] },
    { id: 'aussicht', label: 'Aussicht', kats: ['Aussichtspunkt'] },
    { id: 'essen', label: 'Essen', kats: ['Essen für alle', 'Café'] },
    { id: 'veggie', label: 'Veggie', kats: ['Vegan portugiesisch', 'Vegetarisch'] },
    { id: 'abends', label: 'Abends', kats: ['Bar', 'Fado', 'Getränk'] },
    { id: 'verkehr', label: 'Verkehr', kats: ['Verkehr'] },
  ];
  const PLAN_IDS = ['A', 'B', 'C', 'alle'];
  const MAX_STOPPS = 10; // Google Maps: bis 9 Zwischenstopps plus Ziel
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const LISSABON = [38.7139, -9.1394];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  function el(tag, attrs, ...kinder) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kind of kinder.flat(Infinity)) {
      if (kind == null || kind === false) continue;
      e.append(kind.nodeType ? kind : String(kind));
    }
    return e;
  }
  // Ersetzt Kinder; Arrays werden aufgelöst, null/false weggelassen
  const setze = (box, ...kinder) => box.replaceChildren(...kinder.flat(Infinity).filter((k) => k != null && k !== false));
  const speicher = {
    get(k, d) { try { const v = localStorage.getItem('lk:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lk:' + k, JSON.stringify(v)); } catch (e) { /* privat-Modus */ } },
  };

  const gruppeVon = (kat) => (GRUPPEN.find((g) => g.kats.includes(kat)) || GRUPPEN[0]).id;
  const hatPos = (o) => o && typeof o.lat === 'number' && typeof o.lon === 'number';
  const istTipp = (o) => /Geheimtipp/.test(o.notiz || '');
  const notizOhneTipp = (o) => (o.notiz || '').replace(/\s*\(Geheimtipp\)/, '');

  function meter(a, b) {
    const r = Math.PI / 180, p1 = a.lat * r, p2 = b.lat * r;
    const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  const abstandText = (m) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

  // Navigationsziel als Text: Google und Apple finden Lokale über Name plus Adresse genauer als über Koordinaten
  function zielText(o) {
    if (/[()]|\sund\s|^Tram |^Fähre /.test(o.name) || o.adresse.startsWith(o.name)) return o.adresse;
    return `${o.name}, ${o.adresse}`;
  }
  const googleZiel = (o) => 'https://www.google.com/maps/dir/?api=1&travelmode=walking&dir_action=navigate&destination=' + encodeURIComponent(zielText(o));
  const appleZiel = (o) => 'https://maps.apple.com/directions?mode=walking&destination=' + encodeURIComponent(zielText(o));
  const googleText = (t) => 'https://www.google.com/maps/dir/?api=1&travelmode=walking&dir_action=navigate&destination=' + encodeURIComponent(t);
  const appleText = (t) => 'https://maps.apple.com/directions?mode=walking&destination=' + encodeURIComponent(t);

  function routenTeile(orte) {
    const n = Math.ceil(orte.length / MAX_STOPPS) || 1;
    const groesse = Math.ceil(orte.length / n);
    const teile = [];
    for (let i = 0; i < orte.length; i += groesse) teile.push(orte.slice(i, i + groesse));
    return teile.map((t, i) => {
      const ziel = zielText(t[t.length - 1]);
      const wp = t.slice(0, -1).map(zielText);
      return {
        nr: i + 1, von: teile.length,
        g: 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + encodeURIComponent(ziel) +
          (wp.length ? '&waypoints=' + wp.map(encodeURIComponent).join('%7C') : ''),
        a: 'https://maps.apple.com/directions?mode=walking&destination=' + encodeURIComponent(ziel) +
          wp.map((w) => '&waypoint=' + encodeURIComponent(w)).join(''),
      };
    });
  }

  // art: 'los' = großer Hauptknopf (wie „Starten“ in Google Maps), sonst „Route“
  function naviLinks(o, art) {
    const text = art === 'los' ? 'Starten' : 'Route';
    const gross = art === 'los' ? ' los' : '';
    const g = el('a', { class: 'navi' + gross + (IOS ? ' zwei' : ''), href: googleZiel(o), target: '_blank', rel: 'noopener',
      'aria-label': `${text}: zu ${o.name} mit Google Maps` }, IOS ? 'Google' : text);
    if (!IOS) return [g];
    const a = el('a', { class: 'navi' + gross, href: appleZiel(o), target: '_blank', rel: 'noopener',
      'aria-label': `${text}: zu ${o.name} mit Apple Karten` }, text);
    return art === 'los' ? [a] : [a, g];
  }

  // ---------- Zustand ----------
  const state = {
    plan: speicher.get('plan', 'A'),
    tag: speicher.get('tag', 'sa'),
    filter: new Set(speicher.get('filter', GRUPPEN.map((g) => g.id))),
    offen: false,
    me: null, meZuletzt: null, follow: false, watchId: null, letzterFehler: 0,
  };
  const heute = new Date();
  const heuteIso = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-${String(heute.getDate()).padStart(2, '0')}`;
  const heuteTag = TAGE.find((t) => t.datum === heuteIso);
  if (heuteTag) state.tag = heuteTag.id;
  const hash = /^#(A|B|C|alle)(?:-(sa|so|mo))?$/.exec(location.hash);
  if (hash) { state.plan = hash[1]; if (hash[2]) state.tag = hash[2]; }
  if (!PLAN_IDS.includes(state.plan)) state.plan = 'A';
  if (!TAGE.some((t) => t.id === state.tag)) state.tag = 'sa';

  const ORTE = new Map();
  let PLAENE = {};

  // ---------- Karte ----------
  let karte = null, ebene = null, ichPunkt = null, ichKreis = null;
  const marker = new Map();
  if (window.L) {
    karte = L.map('karte', { zoomControl: false }).setView(LISSABON, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    }).addTo(karte);
    ebene = L.layerGroup().addTo(karte);
    karte.on('dragstart', () => { if (state.follow) { state.follow = false; gpsKnopf(); } });
  } else {
    $('#karte').replaceWith(el('div', { class: 'ohne-karte' }, 'Die Karte konnte nicht geladen werden. Die Liste und die Navigation funktionieren trotzdem.'));
  }

  function pinIcon(o, nr, opt) {
    const s = nr ? 30 : opt.alt ? 22 : 18;
    const klassen = ['pin', 'g-' + gruppeVon(o.kategorie)];
    if (opt.alt) klassen.push('alt');
    if (opt.erledigt) klassen.push('erledigt');
    const stern = istTipp(o) ? '<span class="stern" aria-hidden="true">★</span>' : '';
    return L.divIcon({
      className: 'pin-huelle',
      html: `<span class="${klassen.join(' ')}">${nr || ''}</span>${stern}`,
      iconSize: [s, s], iconAnchor: [s / 2, s / 2], popupAnchor: [0, -s / 2],
    });
  }

  function popupInhalt(o) {
    return el('div', {},
      el('h4', {}, o.name, istTipp(o) ? ' ★' : ''),
      el('p', { class: 'notiz' }, o.kategorie, ' · ', notizOhneTipp(o)),
      o.quelle === 'pruefen' ? el('p', { class: 'unsicher' }, 'Kartenpunkt ungefähr, Navi sucht über die Adresse') : null,
      el('div', { class: 'aktionen' }, naviLinks(o, 'klein')));
  }

  function setzeMarker(o, nr, opt) {
    if (!karte || !hatPos(o)) return;
    const m = L.marker([o.lat, o.lon], { icon: pinIcon(o, nr, opt), title: o.name, zIndexOffset: nr ? 500 : 0 })
      .bindPopup(() => popupInhalt(o), { maxWidth: 280 })
      .addTo(ebene);
    if (!opt.alt || !marker.has(o.name)) marker.set(o.name, m);
  }

  function zeige(o) {
    if (!karte) return;
    if (!hatPos(o)) { toast('Für diesen Ort fehlt noch der Kartenpunkt. Die Navigation funktioniert trotzdem.'); return; }
    state.offen = false; state.follow = false; blattZustand(); gpsKnopf();
    karte.setView([o.lat, o.lon], Math.max(karte.getZoom(), 16));
    const m = marker.get(o.name);
    if (m) m.openPopup();
  }

  function passeAn(punkte) {
    if (!karte || !punkte.length || state.follow) return;
    const unten = $('#blatt').offsetHeight + 10;
    const oben = $('#kopf').offsetHeight + 16;
    if (punkte.length === 1) karte.setView(punkte[0], 16);
    else karte.fitBounds(punkte, { paddingTopLeft: [24, oben], paddingBottomRight: [64, unten], maxZoom: 16 });
  }

  // ---------- Erledigt ----------
  const erledigtSchluessel = (name) => `erledigt:${state.plan}:${state.tag}:${name}`;
  const istErledigt = (name) => speicher.get(erledigtSchluessel(name), false);

  // ---------- Kopfleiste ----------
  function baueChips() {
    const box = $('#chips');
    setze(box, ...GRUPPEN.map((g) => el('button', {
      type: 'button', 'data-gruppe': g.id, style: `--punkt: var(--g-${g.id})`,
      onclick: () => {
        if (state.filter.has(g.id) && state.filter.size === GRUPPEN.length) { state.filter = new Set([g.id]); }
        else if (state.filter.has(g.id)) { state.filter.delete(g.id); if (!state.filter.size) state.filter = new Set(GRUPPEN.map((x) => x.id)); }
        else state.filter.add(g.id);
        speicher.set('filter', [...state.filter]);
        zeichne(true);
      },
    }, g.label)));
  }

  function kopf() {
    $$('[data-plan]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.plan === state.plan)));
    $$('[data-tag]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tag === state.tag)));
    $$('[data-gruppe]').forEach((b) => b.setAttribute('aria-pressed', String(state.filter.has(b.dataset.gruppe))));
    $('#tage').hidden = state.plan === 'alle';
    $('#chips').hidden = state.plan !== 'alle';
    requestAnimationFrame(masse);
  }

  function masse() {
    const r = document.documentElement.style;
    r.setProperty('--kopf-h', $('#kopf').offsetHeight + 'px');
    const b = $('#blatt');
    r.setProperty('--blatt-akt', b.offsetHeight + 'px');
    if (!b.classList.contains('offen')) r.setProperty('--blatt-min', b.offsetHeight + 'px');
  }

  // ---------- Blatt ----------
  function blattZustand() {
    $('#blatt').classList.toggle('offen', state.offen);
    $('#griff').setAttribute('aria-expanded', String(state.offen));
    requestAnimationFrame(masse);
  }

  function heimZeile() {
    const heim = speicher.get('heim', '');
    if (!heim) return null;
    return el('div', { class: 'routen' },
      IOS ? el('a', { class: 'navi zwei', href: appleText(heim), target: '_blank', rel: 'noopener' }, 'Zur Unterkunft') : null,
      el('a', { class: 'navi zwei', href: googleText(heim), target: '_blank', rel: 'noopener' }, IOS ? 'Unterkunft (Google)' : 'Zur Unterkunft'));
  }

  function schritteVon(plan, tag) {
    let s = PLAENE[plan] && PLAENE[plan].tage && PLAENE[plan].tage[tag];
    if (typeof s === 'string') s = PLAENE[s] && PLAENE[s].tage && PLAENE[s].tage[tag];
    return Array.isArray(s) ? s : [];
  }

  function zeichne(anpassen) {
    kopf();
    if (ebene) ebene.clearLayers();
    marker.clear();
    if (state.plan === 'alle') zeichneAlle(anpassen); else zeichnePlan(anpassen);
    zeichneIch();
    try { history.replaceState(null, '', '#' + (state.plan === 'alle' ? 'alle' : `${state.plan}-${state.tag}`)); } catch (e) { /* egal */ }
  }

  function zeichnePlan(anpassen) {
    const plan = PLAENE[state.plan] || { titel: 'Plan ' + state.plan, untertitel: '' };
    const tag = TAGE.find((t) => t.id === state.tag);
    const schritte = schritteVon(state.plan, state.tag);
    const liste = el('ol', { class: 'stopps' });
    const punkte = [], stopps = [];
    let nr = 0, fertig = 0, naechster = null;

    for (const s of schritte) {
      if (s.hinweis) { liste.append(el('li', { class: 'hinweis' }, s.hinweis)); continue; }
      const o = ORTE.get(s.ort);
      if (!o) continue;
      nr += 1;
      const erledigt = istErledigt(o.name);
      stopps.push(o);
      if (erledigt) fertig += 1;
      if (!erledigt && !naechster) naechster = { o, nr, s };
      setzeMarker(o, nr, { erledigt });
      if (hatPos(o)) punkte.push([o.lat, o.lon]);
      const alts = (s.alt || []).map((n) => ORTE.get(n)).filter(Boolean);
      alts.forEach((a) => setzeMarker(a, null, { alt: true }));
      liste.append(stoppZeile(o, nr, s, erledigt, alts));
    }
    if (karte && punkte.length > 1) {
      L.polyline(punkte, { className: 'route', color: '#1d4f91', weight: 4, opacity: 0.8, dashArray: '1 9', lineCap: 'round', interactive: false }).addTo(ebene);
    }

    setze($('#zusammenfassung'), 
      el('span', {}, `${plan.titel} · ${tag.kurz}`),
      el('small', {}, fertig ? `${fertig} von ${nr} erledigt` : `${nr} Stopps`));
    state.naechsterName = naechster ? naechster.o.name : null;

    const routen = el('div', { class: 'routen' });
    if (stopps.length) {
      for (const t of routenTeile(stopps)) {
        const teil = t.von > 1 ? ` Teil ${t.nr}/${t.von}` : '';
        if (IOS) routen.append(el('a', { class: 'navi', href: t.a, target: '_blank', rel: 'noopener' }, 'Tagesroute' + teil));
        routen.append(el('a', { class: 'navi' + (IOS ? ' zwei' : ''), href: t.g, target: '_blank', rel: 'noopener' }, (IOS ? 'Google' : 'Tagesroute in Google Maps') + teil));
      }
    }
    setze($('#blatt-inhalt'), 
      el('p', { class: 'untertitel' }, plan.untertitel ? `${plan.untertitel}. ` : '', 'Tagesroute: alle Stopps nacheinander zu Fuß.'),
      routen, heimZeile(),
      stopps.length ? liste : el('p', { class: 'leer' }, 'Für diesen Tag gibt es keine Stopps.'));

    const box = $('#naechster');
    if (naechster) {
      setze(box, 
        el('button', { type: 'button', class: 'nr g-' + gruppeVon(naechster.o.kategorie), 'aria-label': 'Auf Karte zeigen', onclick: () => zeige(naechster.o) }, String(naechster.nr)),
        el('div', { class: 'was' },
          el('span', {}, `Nächster Stopp ${naechster.nr} von ${nr}` + (naechster.s.zeit ? ` · ${naechster.s.zeit} Uhr` : '')),
          el('strong', {}, naechster.o.name),
          el('div', { class: 'fortschritt', 'aria-hidden': 'true' }, el('span', { style: `width:${Math.round((fertig / nr) * 100)}%` }))),
        naviLinks(naechster.o, 'los'));
    } else {
      setze(box, el('div', { class: 'was' }, el('span', {}, stopps.length ? 'Alles erledigt' : ''), el('strong', {}, stopps.length ? 'Schönen Abend!' : '')));
    }
    if (anpassen) requestAnimationFrame(() => passeAn(punkte));
  }

  function stoppZeile(o, nr, s, erledigt, alts) {
    const id = 'h-' + state.plan + state.tag + nr;
    return el('li', { class: 'stopp' + (erledigt ? ' erledigt' : '') },
      el('button', { type: 'button', class: 'nr g-' + gruppeVon(o.kategorie), 'aria-label': `${o.name} auf der Karte zeigen`, onclick: () => zeige(o) }, String(nr)),
      el('div', { class: 'stopp-text' },
        el('div', { class: 'zeile1' },
          s.zeit ? el('span', { class: 'zeit' }, s.zeit) : null,
          el('button', { type: 'button', class: 'name', onclick: () => zeige(o) }, o.name, istTipp(o) ? ' ★' : '')),
        s.text ? el('p', { class: 'plan-text' }, s.text) : null,
        el('p', { class: 'notiz' }, notizOhneTipp(o)),
        el('span', { class: 'abstand', 'data-ort': o.name }, abstandFuer(o)),
        o.quelle === 'pruefen' ? el('span', { class: 'unsicher' }, 'Kartenpunkt ungefähr') : null,
        alts.map((a) => el('p', { class: 'alt-zeile' }, 'Oder: ',
          el('button', { type: 'button', class: 'name', style: 'font-size:14px', onclick: () => zeige(a) }, a.name),
          el('span', { class: 'notiz' }, notizOhneTipp(a)),
          naviLinks(a, 'klein'))),
        el('div', { class: 'aktionen' },
          naviLinks(o, 'liste'),
          el('label', { class: 'haken', for: id },
            el('input', { type: 'checkbox', id, checked: erledigt, onchange: (e) => {
              speicher.set(erledigtSchluessel(o.name), e.target.checked);
              const scroll = $('#blatt-inhalt').scrollTop;
              zeichne(false);
              $('#blatt-inhalt').scrollTop = scroll;
              if (e.target.checked) toast(state.naechsterName ? `Weiter zu: ${state.naechsterName}` : 'Alle Stopps für heute erledigt.');
            } }),
            'Erledigt'))));
  }

  function zeichneAlle(anpassen) {
    let orte = [...ORTE.values()].filter((o) => state.filter.has(gruppeVon(o.kategorie)));
    const reihenfolge = GRUPPEN.map((g) => g.id);
    if (state.me) orte.sort((a, b) => (hatPos(a) ? meter(state.me, a) : 1e9) - (hatPos(b) ? meter(state.me, b) : 1e9));
    else orte.sort((a, b) => reihenfolge.indexOf(gruppeVon(a.kategorie)) - reihenfolge.indexOf(gruppeVon(b.kategorie)) || a.name.localeCompare(b.name, 'pt'));
    const punkte = [];
    orte.forEach((o) => { setzeMarker(o, null, {}); if (hatPos(o)) punkte.push([o.lat, o.lon]); });
    setze($('#zusammenfassung'), 
      el('span', {}, 'Alle Orte'),
      el('small', {}, `${orte.length} Orte${state.me ? ' · nach Nähe' : ''}`));
    const liste = el('ul', { class: 'stopps alle' }, orte.map((o) => el('li', { class: 'stopp' },
      el('button', { type: 'button', class: 'nr g-' + gruppeVon(o.kategorie), 'aria-label': `${o.name} auf der Karte zeigen`, onclick: () => zeige(o) }),
      el('div', { class: 'stopp-text' },
        el('div', { class: 'zeile1' }, el('button', { type: 'button', class: 'name', onclick: () => zeige(o) }, o.name, istTipp(o) ? ' ★' : '')),
        el('p', { class: 'notiz' }, o.kategorie, ' · ', notizOhneTipp(o)),
        el('span', { class: 'abstand', 'data-ort': o.name }, abstandFuer(o)),
        el('div', { class: 'aktionen' }, naviLinks(o, 'liste'))))));
    setze($('#blatt-inhalt'), 
      el('p', { class: 'untertitel' }, state.me ? 'Sortiert nach Entfernung von dir.' : 'Tippe auf den Standort-Knopf, dann sortiert die Liste nach Nähe.'),
      heimZeile(), liste);
    const box = $('#naechster');
    const nah = state.me && orte.find(hatPos);
    setze(box, nah
      ? [el('div', { class: 'was' }, el('span', {}, `Am nächsten · ${abstandText(meter(state.me, nah))}`), el('strong', {}, nah.name)), naviLinks(nah, 'los')]
      : [el('div', { class: 'was' }, el('span', {}, 'Frei erkunden'), el('strong', {}, 'Tippe auf einen Punkt'))]);
    if (anpassen) requestAnimationFrame(() => passeAn(punkte));
  }

  function abstandFuer(o) {
    return state.me && hatPos(o) ? `${abstandText(meter(state.me, o))} Luftlinie` : '';
  }

  // ---------- Standort ----------
  function gpsKnopf() {
    const b = $('#btn-gps');
    b.dataset.zustand = state.watchId == null ? 'aus' : !state.me ? 'sucht' : state.follow ? 'folgt' : 'an';
  }

  function zeichneIch() {
    if (!karte || !state.me) return;
    const p = [state.me.lat, state.me.lon];
    if (!ichKreis) ichKreis = L.circle(p, { radius: state.me.acc, className: 'ich-genau', interactive: false }).addTo(karte);
    if (!ichPunkt) ichPunkt = L.circleMarker(p, { radius: 8, weight: 3, className: 'ich', fillOpacity: 1, interactive: false }).addTo(karte);
    ichKreis.setLatLng(p).setRadius(state.me.acc);
    ichPunkt.setLatLng(p);
  }

  function aufPosition(p) {
    const neu = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.min(p.coords.accuracy || 0, 2000) };
    const erst = !state.me;
    state.me = neu;
    zeichneIch();
    if (karte && state.follow) karte.setView([neu.lat, neu.lon], erst ? Math.max(karte.getZoom(), 16) : karte.getZoom(), { animate: !erst });
    const bewegt = !state.meZuletzt || meter(state.meZuletzt, neu) > 40;
    if (bewegt) {
      state.meZuletzt = neu;
      if (state.plan === 'alle') zeichneAlleNurListe();
      else $$('.abstand[data-ort]').forEach((s) => { s.textContent = abstandFuer(ORTE.get(s.dataset.ort)); });
    }
    gpsKnopf();
  }

  function zeichneAlleNurListe() {
    const scroll = $('#blatt-inhalt').scrollTop;
    if (ebene) ebene.clearLayers();
    marker.clear();
    zeichneAlle(false);
    $('#blatt-inhalt').scrollTop = scroll;
  }

  function aufFehler(e) {
    if (e.code === 1) {
      if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null; state.follow = false;
      toast('Standort nicht erlaubt. In den Browser-Einstellungen für diese Seite den Standort freigeben und neu laden.', 7000);
    } else if (Date.now() - state.letzterFehler > 60000) {
      state.letzterFehler = Date.now();
      toast('Standort gerade nicht verfügbar. Draußen klappt es meist besser.');
    }
    gpsKnopf();
  }

  $('#btn-gps').addEventListener('click', () => {
    if (!('geolocation' in navigator)) { toast('Dieses Gerät gibt keinen Standort heraus.'); return; }
    if (state.watchId == null) {
      state.follow = true;
      state.watchId = navigator.geolocation.watchPosition(aufPosition, aufFehler, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
      toast('Suche Standort …', 2500);
    } else if (state.me && karte) {
      state.follow = true;
      karte.setView([state.me.lat, state.me.lon], Math.max(karte.getZoom(), 16));
    }
    gpsKnopf();
  });

  // ---------- Bedienung ----------
  $$('[data-plan]').forEach((b) => b.addEventListener('click', () => {
    state.plan = b.dataset.plan; speicher.set('plan', state.plan); zeichne(true);
  }));
  $$('[data-tag]').forEach((b) => b.addEventListener('click', () => {
    state.tag = b.dataset.tag; speicher.set('tag', state.tag); zeichne(true);
  }));
  $('#griff').addEventListener('click', () => { state.offen = !state.offen; blattZustand(); });
  // Wischen wie bei Google und Apple Maps: hoch öffnet, runter schließt das Blatt
  let startY = null;
  $('#blatt').addEventListener('touchstart', (e) => {
    const inhalt = e.target.closest('.blatt-inhalt');
    startY = inhalt && inhalt.scrollTop > 0 ? null : e.touches[0].clientY;
  }, { passive: true });
  $('#blatt').addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy < -40 && !state.offen) { state.offen = true; blattZustand(); }
    else if (dy > 60 && state.offen) { state.offen = false; blattZustand(); }
  }, { passive: true });
  $('#btn-info').addEventListener('click', () => { $('#heim').value = speicher.get('heim', ''); $('#info').hidden = false; $('#info-zu').focus(); });
  $('#info-zu').addEventListener('click', () => { $('#info').hidden = true; });
  $('#info').addEventListener('click', (e) => { if (e.target.id === 'info') $('#info').hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#info').hidden = true; });
  $('#heim-speichern').addEventListener('click', () => {
    const v = $('#heim').value.trim();
    speicher.set('heim', v);
    toast(v ? 'Unterkunft gespeichert, nur auf diesem Handy.' : 'Unterkunft entfernt.');
    $('#info').hidden = true;
    zeichne(false);
  });
  window.addEventListener('resize', () => { masse(); if (karte) karte.invalidateSize(); });

  let toastTimer = null;
  function toast(text, ms) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 4500);
  }

  // ---------- Daten laden ----------
  async function lade(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }
  baueChips();
  blattZustand();
  Promise.all([lade('orte.json'), lade('plaene.json')]).then(([orte, plaene]) => {
    orte.forEach((o) => ORTE.set(o.name, o));
    PLAENE = plaene;
    const ohne = orte.filter((o) => !hatPos(o)).length;
    if (ohne === orte.length) toast('Die Kartenpunkte werden gerade erstellt. Liste und Navigation funktionieren schon.', 7000);
    zeichne(true);
    if (!speicher.get('gesehen', false)) {
      speicher.set('gesehen', true);
      setTimeout(() => toast('Unten auf „Starten“ tippen: Die Navigation führt euch zum nächsten Stopp. Nach oben wischen zeigt den ganzen Tag.', 9000), 800);
    }
  }).catch(() => {
    $('#zusammenfassung').textContent = 'Daten nicht geladen';
    setze($('#blatt-inhalt'), el('p', { class: 'leer' }, 'Die Orte konnten nicht geladen werden. Bitte Seite neu laden.'));
    state.offen = true; blattZustand();
  });
})();
