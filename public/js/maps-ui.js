/* Widżety mapy: wybór miasta z promieniem, mapa wyników, pinezka ogłoszenia, pinezka w formularzu. */
(function () {
  'use strict';
  if (!window.MiniMap) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var nf = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var short = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace('.', ',').replace(/,?0+$/, '') + ' mln' : n >= 1e4 ? Math.round(n / 1e3) + ' tys.' : nf(n) + ' zł'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function cities() {
    var el = $('#cities-data');
    if (!el) return [];
    try { return JSON.parse(el.textContent); } catch (e) { return []; }
  }

  /* 1. Wybór miasta na mapie + promień (okno) */
  var modal = $('#mapPicker');
  if (modal) {
    var list = cities(), map = null, chosen = null, marks = [];
    var radiusSel = $('[data-mp-radius]', modal), info = $('[data-mp-info]', modal), go = $('[data-mp-go]', modal);
    var typeSel = $('[data-mp-type]', modal), trSel = $('[data-mp-tr]', modal);
    function pick(c) {
      chosen = c;
      marks.forEach(function (m) { m.el.classList.toggle('is-on', m.city === c); });
      draw();
    }
    function draw() {
      if (!map) return;
      var km = Number(radiusSel.value) || 0;
      if (chosen) map.setCircle(chosen.lat, chosen.lng, km);
      info.innerHTML = chosen ? '<b>' + esc(chosen.name) + '</b>' + (km ? ' + ' + km + ' km' : '') + ' <span class="text-muted">(' + esc(chosen.v === 'pomorskie' ? 'pomorskie' : 'zachodniopomorskie') + ')</span>' : 'Kliknij miasto na mapie';
      go.disabled = !chosen;
    }
    function open(preset) {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (!map) {
        map = new MiniMap($('[data-mp-map]', modal), { center: [54.0, 16.6], zoom: 7, minZoom: 6, maxZoom: 13 });
        list.forEach(function (c) {
          var m = map.addMarker(c.lat, c.lng, { className: 'mm-city' + (c.major ? ' is-major' : ''), html: '<span class="mm-city-dot"></span><span class="mm-city-label">' + esc(c.name) + '</span>', title: c.name, onClick: function () { pick(c); } });
          m.city = c;
          marks.push(m);
        });
        map.fit(list.map(function (c) { return [c.lat, c.lng]; }));
      } else map.render();
      if (preset) {
        var c = list.filter(function (x) { return x.slug === preset; })[0];
        if (c) { pick(c); map.setView(c.lat, c.lng, 9); }
      }
      draw();
    }
    function close() { modal.hidden = true; document.body.style.overflow = ''; }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-open-map-picker]');
      if (b) { e.preventDefault(); open(b.getAttribute('data-preset')); }
    });
    $$('[data-mp-close]', modal).forEach(function (b) { b.addEventListener('click', close); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
    radiusSel.addEventListener('change', draw);
    go.addEventListener('click', function () {
      if (!chosen) return;
      var km = Number(radiusSel.value) || 0;
      location.href = '/' + trSel.value + '/' + typeSel.value + '/' + chosen.slug + (km ? '?promien=' + km : '');
    });
  }

  /* 2. Mapa wyników wyszukiwania */
  $$('[data-results-map]').forEach(function (el) {
    var map = new MiniMap(el, { center: [54.1, 16.8], zoom: 7 });
    var cLat = Number(el.getAttribute('data-lat')), cLng = Number(el.getAttribute('data-lng')), km = Number(el.getAttribute('data-radius')) || 0;
    if (cLat && km) map.setCircle(cLat, cLng, km);
    var status = $('[data-map-status]');
    fetch(el.getAttribute('data-api'), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
      var pins = (d && d.pins) || [];
      if (status) status.textContent = pins.length ? pins.length + ' ogłoszeń na mapie' + (pins.some(function (p) { return !p.precise; }) ? ' · część oznaczona w centrum miejscowości (bez dokładnego adresu)' : '') : 'Brak ogłoszeń z lokalizacją dla tych filtrów.';
      // nakładające się pinezki rozsuwamy lekko po okręgu
      var seen = {};
      pins.forEach(function (p) {
        var k = p.lat.toFixed(3) + ',' + p.lng.toFixed(3);
        var n = seen[k] = (seen[k] || 0) + 1;
        if (n > 1) { var a = n * 2.4; p.lat += Math.sin(a) * 0.0012 * Math.ceil(n / 6); p.lng += Math.cos(a) * 0.002 * Math.ceil(n / 6); }
        map.addMarker(p.lat, p.lng, {
          className: 'mm-price' + (p.featured ? ' is-featured' : '') + (p.precise ? '' : ' is-approx'),
          html: short(p.price) + (p.tr === 'wynajem' ? '/mc' : ''),
          title: p.title,
          onClick: function () {
            map.openPopup(p.lat, p.lng, '<a href="' + p.url + '" class="mm-card">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') + '<span><b>' + nf(p.price) + ' zł' + (p.tr === 'wynajem' ? '/mc' : '') + '</b><span class="mm-card-t">' + esc(p.title) + '</span><span class="mm-card-m">' + [p.area ? nf(p.area) + ' m²' : '', p.rooms ? p.rooms + ' pok.' : '', esc(p.city)].filter(Boolean).join(' · ') + '</span></span></a>');
          }
        });
      });
      if (cLat && km) map.fit([[cLat - km / 111, cLng - km / 70], [cLat + km / 111, cLng + km / 70]], 13);
      else if (pins.length) map.fit(pins.map(function (p) { return [p.lat, p.lng]; }), 14);
    }).catch(function () { if (status) status.textContent = 'Nie udało się wczytać mapy.'; });
  });

  /* 3. Mapa na stronie ogłoszenia */
  $$('[data-listing-map]').forEach(function (el) {
    var lat = Number(el.getAttribute('data-lat')), lng = Number(el.getAttribute('data-lng')), precise = el.getAttribute('data-precise') === '1';
    var map = new MiniMap(el, { center: [lat, lng], zoom: precise ? 16 : 13, minZoom: 7 });
    if (precise) map.addMarker(lat, lng, { className: 'mm-pin', html: '<span></span>', title: 'Lokalizacja nieruchomości' });
    else map.setCircle(lat, lng, 0.9, 'is-soft');
  });

  /* 4. Pinezka w formularzu ogłoszenia */
  $$('[data-pin-map]').forEach(function (el) {
    var form = el.closest('form');
    var latI = $('[name="lat"]', form), lngI = $('[name="lng"]', form), citySel = $('[data-city]', form), msg = $('[data-pin-msg]', form);
    var list = cities(), marker = null;
    function cityOf(slug) { return list.filter(function (c) { return c.slug === slug; })[0]; }
    var start = latI.value ? [Number(latI.value), Number(lngI.value)] : (cityOf(citySel.value) ? [cityOf(citySel.value).lat, cityOf(citySel.value).lng] : [54.1, 16.8]);
    var map = new MiniMap(el, { center: start, zoom: latI.value ? 16 : citySel.value ? 13 : 7, minZoom: 6, onClick: set });
    function set(lat, lng, label) {
      latI.value = lat.toFixed(6);
      lngI.value = lng.toFixed(6);
      if (marker) map.removeMarker(marker);
      marker = map.addMarker(lat, lng, { className: 'mm-pin', html: '<span></span>' });
      if (msg) msg.textContent = label ? 'Znaleziono: ' + label : 'Pinezka ustawiona. Możesz kliknąć w inne miejsce, aby ją przesunąć.';
    }
    if (latI.value) set(Number(latI.value), Number(lngI.value), '');
    citySel.addEventListener('change', function () {
      var c = cityOf(citySel.value);
      if (c && !latI.value) map.setView(c.lat, c.lng, 13);
    });
    var findBtn = $('[data-pin-find]', form);
    if (findBtn) findBtn.addEventListener('click', function () {
      if (!citySel.value) { if (msg) msg.textContent = 'Najpierw wybierz miejscowość.'; return; }
      findBtn.disabled = true;
      if (msg) msg.textContent = 'Szukam adresu…';
      var q = '/api/geokoduj?miasto=' + encodeURIComponent(citySel.value) + '&ulica=' + encodeURIComponent(($('[name="street"]', form) || {}).value || '') + '&dzielnica=' + encodeURIComponent(($('[name="district"]', form) || {}).value || '');
      fetch(q, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) { set(d.lat, d.lng, d.label); map.setView(d.lat, d.lng, 17); }
        else { if (msg) msg.textContent = d.error || 'Nie znaleziono adresu.'; if (d.lat) map.setView(d.lat, d.lng, 13); }
      }).catch(function () { if (msg) msg.textContent = 'Nie udało się wyszukać adresu. Kliknij na mapie.'; })
        .then(function () { findBtn.disabled = false; });
    });
    var clearBtn = $('[data-pin-clear]', form);
    if (clearBtn) clearBtn.addEventListener('click', function () {
      latI.value = ''; lngI.value = '';
      if (marker) map.removeMarker(marker);
      marker = null;
      if (msg) msg.textContent = 'Pinezka usunięta – ogłoszenie pokaże okolicę miejscowości.';
    });
  });
})();
