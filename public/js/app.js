/* ModulioEstate – interakcje po stronie przeglądarki (bez zależności) */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var csrf = ($('meta[name="csrf-token"]') || {}).content || '';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var nf = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function post(url) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
  }

  /* Przełączniki: menu mobilne, filtry, panel boczny */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-toggle]');
    if (btn) {
      var target = $(btn.getAttribute('data-toggle'));
      if (!target) return;
      if (target.hasAttribute('hidden')) target.removeAttribute('hidden');
      else if (target.classList.contains('hidden')) { target.classList.remove('hidden'); target.classList.add('grid'); }
      else if (btn.getAttribute('data-toggle') === '#mobileMenu') target.setAttribute('hidden', '');
      else { target.classList.add('hidden'); target.classList.remove('grid'); }
      btn.setAttribute('aria-expanded', String(!target.hasAttribute('hidden') && !target.classList.contains('hidden')));
      return;
    }
    // zamykanie rozwijanych menu <details data-dropdown> po kliknięciu obok
    $$('details[data-dropdown][open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  /* Potwierdzenia */
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-confirm]');
    if (c && !window.confirm(c.getAttribute('data-confirm'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* Automatyczne wysyłanie formularzy */
  $$('form[data-autosubmit] select').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  $$('[data-autosubmit-field]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });

  /* Ulubione */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-fav');
    post('/api/ulubione/' + id).then(function (r) {
      if (r.status === 401) { window.location.href = '/logowanie'; return null; }
      return r.json();
    }).then(function (d) {
      if (!d || !d.ok) return;
      $$('[data-fav="' + id + '"]').forEach(function (el) {
        el.setAttribute('aria-pressed', String(d.fav));
        var svg = el.querySelector('svg');
        if (svg) d.fav ? svg.setAttribute('fill', 'currentColor') : svg.removeAttribute('fill');
        el.classList.toggle('text-orange-500', d.fav);
        if (el.classList.contains('bg-white/30') || el.classList.contains('bg-white')) {
          el.classList.toggle('bg-white', d.fav);
          el.classList.toggle('bg-white/30', !d.fav);
          el.classList.toggle('text-white', !d.fav);
        }
        var lbl = el.querySelector('[data-fav-label]');
        if (lbl) lbl.textContent = d.fav ? 'Zapisano' : 'Zapisz';
      });
      var c = $('[data-fav-count]');
      if (c) { c.textContent = d.count; c.hidden = !d.count; }
      toast(d.fav ? 'Dodano do ulubionych' : 'Usunięto z ulubionych');
    }).catch(function () { toast('Nie udało się zapisać. Spróbuj ponownie.'); });
  });

  /* Pokaż numer telefonu */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-phone]');
    if (!b) return;
    if (b.getAttribute('data-revealed')) return;
    post('/api/oferta/' + b.getAttribute('data-phone') + '/telefon').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok || !d.phone) return;
      var a = document.createElement('a');
      a.href = 'tel:' + d.phone.replace(/\s/g, '');
      a.className = b.className;
      a.innerHTML = b.innerHTML;
      a.querySelector('[data-phone-out]').textContent = d.phone;
      a.setAttribute('data-revealed', '1');
      b.replaceWith(a);
    });
  });

  /* Udostępnij / kopiuj link */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-share]');
    if (!b) return;
    var url = window.location.href.split('#')[0];
    if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link skopiowany'); }, function () { window.prompt('Skopiuj link:', url); });
    else window.prompt('Skopiuj link:', url);
  });

  /* Pokaż hasło */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-reveal]');
    if (!b) return;
    var i = $(b.getAttribute('data-reveal'));
    if (i) i.type = i.type === 'password' ? 'text' : 'password';
  });

  /* Zakładki (strona główna) */
  $$('[data-tabs]').forEach(function (box) {
    $$('[data-tab]', box).forEach(function (t) {
      t.addEventListener('click', function () {
        var key = t.getAttribute('data-tab');
        $$('[data-tab]', box).forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
        $$('[data-panel]', box).forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      });
    });
  });

  /* Wyszukiwarka w hero */
  $$('[data-hero-search]').forEach(function (form) {
    var tr = $('[data-hs-tr]', form), mk = $('[data-hs-market]', form), type = $('[data-hs-type]', form), price = $('[data-hs-price]', form), label = $('[data-hs-price-label]', form);
    function fillPrices(rent) {
      var vals = (price.getAttribute(rent ? 'data-rent' : 'data-sale') || '').split(',');
      price.innerHTML = '<option value="">Dowolna</option>' + vals.map(function (v) {
        var n = Number(v);
        var txt = n >= 1e6 ? (n / 1e6).toString().replace('.', ',') + ' mln zł' : n >= 1e4 ? Math.round(n / 1e3) + ' tys. zł' : nf(n) + ' zł/mc';
        return '<option value="' + v + '">' + txt + '</option>';
      }).join('');
      label.textContent = rent ? 'Czynsz do' : 'Cena do';
    }
    $$('[data-hs-tab]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-hs-tab');
        $$('[data-hs-tab]', form).forEach(function (x) {
          var on = x === b;
          x.setAttribute('aria-selected', String(on));
          x.classList.toggle('bg-white', on);
          x.classList.toggle('text-navy-800', on);
          x.classList.toggle('text-white/85', !on);
        });
        tr.value = k === 'wynajem' ? 'wynajem' : 'sprzedaz';
        mk.disabled = k !== 'pierwotny';
        mk.value = k === 'pierwotny' ? 'pierwotny' : '';
        if (k === 'komercyjne') type.value = 'lokal';
        else if (type.value === 'lokal') type.value = 'mieszkanie';
        fillPrices(k === 'wynajem');
      });
    });
  });

  /* Kalkulator raty */
  $$('[data-calc]').forEach(function (box) {
    var price = Number(box.getAttribute('data-price')) || 600000;
    var inp = function (k) { return $('[data-calc-in="' + k + '"]', box); };
    var out = function (k, v) { var el = $('[data-calc-v="' + k + '"]', box); if (el) el.textContent = v; };
    var o = function (k, v) { var el = $('[data-calc-o="' + k + '"]', box); if (el) el.textContent = v; };
    function run() {
      if (inp('price')) price = Number(inp('price').value);
      var down = Number(inp('down').value), years = Number(inp('years').value), rate = Number(inp('rate').value);
      var loan = price * (1 - down / 100), n = years * 12, r = rate / 100 / 12;
      var pay = r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
      var interest = pay * n - loan;
      out('price', nf(price) + ' zł');
      out('down', down + '% · ' + nf(price * down / 100) + ' zł');
      out('years', years + ' lat');
      out('rate', rate.toFixed(2).replace('.', ',') + '%');
      $('[data-calc-out]', box).textContent = nf(pay) + ' zł';
      o('loan', nf(loan) + ' zł');
      o('interest', nf(interest) + ' zł');
      var capPart = loan / n;
      o('decFirst', nf(capPart + loan * r) + ' zł');
      o('decInterest', nf(r * loan * (n + 1) / 2) + ' zł');
      var bar = $('[data-calc-bar]', box);
      if (bar) bar.style.width = (loan / (loan + interest) * 100) + '%';
    }
    $$('[data-calc-in]', box).forEach(function (i) { i.addEventListener('input', run); });
    run();
  });

  /* Galeria – lightbox */
  var lb = $('#lightbox');
  if (lb) {
    var imgs = [];
    try { imgs = JSON.parse(lb.getAttribute('data-images') || '[]'); } catch (e) {}
    var idx = 0, img = $('[data-lb-img]', lb), cnt = $('[data-lb-count]', lb);
    var show = function (i) { idx = (i + imgs.length) % imgs.length; img.src = imgs[idx]; cnt.textContent = (idx + 1) + ' / ' + imgs.length; };
    $$('[data-gallery-open]').forEach(function (b) { b.addEventListener('click', function () { show(Number(b.getAttribute('data-gallery-open'))); lb.hidden = false; document.body.style.overflow = 'hidden'; }); });
    var close = function () { lb.hidden = true; document.body.style.overflow = ''; };
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* Formularz ogłoszenia */
  $$('[data-listing-form]').forEach(function (form) {
    var districts = {};
    try { districts = JSON.parse(form.getAttribute('data-districts') || '{}'); } catch (e) {}
    function typeVal() { var c = $('[data-type]:checked', form); return c ? c.value : ''; }
    function trVal() { var c = $('[data-tr]:checked', form); return c ? c.value : 'sprzedaz'; }
    function sync() {
      var t = typeVal(), tr = trVal();
      $$('[data-hide-for]', form).forEach(function (el) { el.hidden = el.getAttribute('data-hide-for').split(',').indexOf(t) > -1; });
      $$('[data-show-for]', form).forEach(function (el) { el.hidden = el.getAttribute('data-show-for').split(',').indexOf(t) === -1; });
      $$('[data-rent-only]', form).forEach(function (el) { el.hidden = tr !== 'wynajem'; });
      var pl = $('[data-price-label]', form);
      if (pl) pl.textContent = tr === 'wynajem' ? 'Czynsz najmu (zł/mc)' : 'Cena (zł)';
    }
    $$('[data-type],[data-tr]', form).forEach(function (r) { r.addEventListener('change', sync); });
    sync();
    var city = $('[data-city]', form), dl = $('#districtList', form);
    function fillDistricts() { if (!dl) return; dl.innerHTML = (districts[city.value] || []).map(function (d) { return '<option value="' + d + '"></option>'; }).join(''); }
    if (city) { city.addEventListener('change', fillDistricts); fillDistricts(); }
    var fi = $('[data-file-input]', form), pv = $('[data-file-preview]', form);
    if (fi && pv) fi.addEventListener('change', function () {
      pv.innerHTML = '';
      Array.prototype.slice.call(fi.files, 0, 40).forEach(function (f, i) {
        var u = URL.createObjectURL(f);
        var d = document.createElement('div');
        d.className = 'relative overflow-hidden rounded-xl border border-line';
        d.innerHTML = '<img src="' + u + '" alt="" class="aspect-[4/3] w-full object-cover">' + (i === 0 ? '<span class="absolute left-1 top-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">główne</span>' : '');
        pv.appendChild(d);
      });
      toast(fi.files.length + ' zdjęć gotowych do wysłania');
    });
  });

  /* Liczniki znaków */
  $$('[data-count]').forEach(function (el) {
    var out = el.parentElement.querySelector('[data-count-out]');
    if (!out) return;
    var max = Number(el.getAttribute('data-count'));
    var upd = function () { out.textContent = el.value.length + ' / ' + max + ' znaków'; };
    el.addEventListener('input', upd);
    upd();
  });

  /* Informacja o cookies */
  var cb = $('#cookieBar');
  if (cb && !store.get('me_cookies')) {
    cb.hidden = false;
    $('[data-cookie-ok]', cb).addEventListener('click', function () { store.set('me_cookies', '1'); cb.hidden = true; });
  }
})();
