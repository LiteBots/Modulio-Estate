/* ModulioEstate – lekka mapa (kafelki OpenStreetMap), bez zewnętrznych bibliotek.
   Używana do: wyboru miasta i promienia, mapy wyników, pinezki ogłoszenia i ustawiania pinezki w formularzu. */
(function () {
  'use strict';
  var TILE = 256;
  var tileUrl = (document.querySelector('meta[name="map-tiles"]') || {}).content || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var attribution = (document.querySelector('meta[name="map-attribution"]') || {}).content || '© OpenStreetMap';

  function lng2x(lng, z) { return ((lng + 180) / 360) * TILE * Math.pow(2, z); }
  function lat2y(lat, z) { var r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * Math.pow(2, z); }
  function x2lng(x, z) { return (x / (TILE * Math.pow(2, z))) * 360 - 180; }
  function y2lat(y, z) { var n = Math.PI - (2 * Math.PI * y) / (TILE * Math.pow(2, z)); return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  function mPerPx(lat, z) { return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z); }

  function MiniMap(el, opts) {
    opts = opts || {};
    this.el = el;
    this.z = opts.zoom || 8;
    this.minZ = opts.minZoom || 6;
    this.maxZ = opts.maxZoom || 18;
    this.lat = opts.center ? opts.center[0] : 54.1;
    this.lng = opts.center ? opts.center[1] : 16.8;
    this.markers = [];
    this.circles = [];
    this.onClick = opts.onClick || null;
    this.onMove = opts.onMove || null;
    el.classList.add('mm');
    el.innerHTML = '<div class="mm-tiles"></div><div class="mm-overlay"></div>' +
      '<div class="mm-zoom"><button type="button" data-z="1" aria-label="Przybliż">+</button><button type="button" data-z="-1" aria-label="Oddal">−</button></div>' +
      '<div class="mm-attr">' + attribution + '</div>';
    this.tiles = el.querySelector('.mm-tiles');
    this.overlay = el.querySelector('.mm-overlay');
    var self = this;
    el.querySelector('.mm-zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) self.zoomBy(Number(b.getAttribute('data-z')));
    });
    this._bind();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { self.render(); }).observe(el);
    this.render();
  }

  MiniMap.prototype._center = function () { return { x: lng2x(this.lng, this.z), y: lat2y(this.lat, this.z) }; };
  MiniMap.prototype.project = function (lat, lng) {
    var c = this._center(), w = this.el.clientWidth, h = this.el.clientHeight;
    return { x: lng2x(lng, this.z) - c.x + w / 2, y: lat2y(lat, this.z) - c.y + h / 2 };
  };
  MiniMap.prototype.unproject = function (px, py) {
    var c = this._center(), w = this.el.clientWidth, h = this.el.clientHeight;
    return { lat: y2lat(c.y + py - h / 2, this.z), lng: x2lng(c.x + px - w / 2, this.z) };
  };
  MiniMap.prototype.setView = function (lat, lng, z) {
    this.lat = lat; this.lng = lng;
    if (z) this.z = Math.max(this.minZ, Math.min(this.maxZ, z));
    this.render();
  };
  MiniMap.prototype.zoomBy = function (d, px, py) {
    var nz = Math.max(this.minZ, Math.min(this.maxZ, this.z + d));
    if (nz === this.z) return;
    if (px !== undefined) {
      var before = this.unproject(px, py);
      this.z = nz;
      var after = this.unproject(px, py);
      this.lat += before.lat - after.lat;
      this.lng += before.lng - after.lng;
    } else this.z = nz;
    this.render();
  };
  MiniMap.prototype.fit = function (points, maxZ) {
    if (!points.length) return;
    var w = this.el.clientWidth || 600, h = this.el.clientHeight || 400;
    var minLat = Math.min.apply(null, points.map(function (p) { return p[0]; })), maxLat = Math.max.apply(null, points.map(function (p) { return p[0]; }));
    var minLng = Math.min.apply(null, points.map(function (p) { return p[1]; })), maxLng = Math.max.apply(null, points.map(function (p) { return p[1]; }));
    var z = maxZ || 15;
    for (; z > this.minZ; z--) {
      if (lng2x(maxLng, z) - lng2x(minLng, z) < w - 80 && lat2y(minLat, z) - lat2y(maxLat, z) < h - 80) break;
    }
    this.setView((minLat + maxLat) / 2, (minLng + maxLng) / 2, z);
  };

  MiniMap.prototype._bind = function () {
    var self = this, drag = null, moved = false;
    this.el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.mm-zoom, .mm-marker, .mm-popup')) return;
      drag = { x: e.clientX, y: e.clientY, c: self._center() };
      moved = false;
      self.el.setPointerCapture(e.pointerId);
    });
    this.el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      self.lng = x2lng(drag.c.x - dx, self.z);
      self.lat = y2lat(drag.c.y - dy, self.z);
      self.render();
    });
    this.el.addEventListener('pointerup', function (e) {
      if (!drag) return;
      drag = null;
      if (!moved && self.onClick && !e.target.closest('.mm-zoom, .mm-marker, .mm-popup')) {
        var r = self.el.getBoundingClientRect();
        var p = self.unproject(e.clientX - r.left, e.clientY - r.top);
        self.onClick(p.lat, p.lng);
      }
      if (moved && self.onMove) self.onMove();
    });
    this.el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = self.el.getBoundingClientRect();
      self.zoomBy(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    this.el.addEventListener('dblclick', function (e) {
      if (e.target.closest('.mm-zoom, .mm-marker, .mm-popup')) return;
      var r = self.el.getBoundingClientRect();
      self.zoomBy(1, e.clientX - r.left, e.clientY - r.top);
    });
  };

  MiniMap.prototype.render = function () {
    var w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    var z = this.z, c = this._center(), n = Math.pow(2, z);
    var x0 = Math.floor((c.x - w / 2) / TILE), x1 = Math.floor((c.x + w / 2) / TILE);
    var y0 = Math.max(0, Math.floor((c.y - h / 2) / TILE)), y1 = Math.min(n - 1, Math.floor((c.y + h / 2) / TILE));
    var html = '';
    for (var tx = x0; tx <= x1; tx++) {
      for (var ty = y0; ty <= y1; ty++) {
        var wx = ((tx % n) + n) % n;
        var url = tileUrl.replace('{z}', z).replace('{x}', wx).replace('{y}', ty).replace('{s}', 'abc'[(wx + ty) % 3]);
        html += '<img alt="" draggable="false" src="' + url + '" style="left:' + Math.round(tx * TILE - c.x + w / 2) + 'px;top:' + Math.round(ty * TILE - c.y + h / 2) + 'px">';
      }
    }
    this.tiles.innerHTML = html;
    var self = this;
    this.circles.forEach(function (ci) {
      var p = self.project(ci.lat, ci.lng), r = (ci.km * 1000) / mPerPx(ci.lat, z);
      ci.el.style.cssText = 'left:' + (p.x - r) + 'px;top:' + (p.y - r) + 'px;width:' + 2 * r + 'px;height:' + 2 * r + 'px';
    });
    this.markers.forEach(function (m) {
      var p = self.project(m.lat, m.lng);
      m.el.style.left = p.x + 'px';
      m.el.style.top = p.y + 'px';
      m.el.hidden = p.x < -60 || p.y < -60 || p.x > w + 60 || p.y > h + 60;
    });
    if (this.popup) {
      var pp = this.project(this.popup.lat, this.popup.lng);
      this.popup.el.style.left = pp.x + 'px';
      this.popup.el.style.top = pp.y + 'px';
    }
  };

  MiniMap.prototype.addMarker = function (lat, lng, o) {
    o = o || {};
    var el = document.createElement(o.href ? 'a' : 'button');
    if (o.href) el.href = o.href; else el.type = 'button';
    el.className = 'mm-marker ' + (o.className || 'mm-pin');
    el.innerHTML = o.html || '';
    if (o.title) el.title = o.title;
    if (o.onClick) el.addEventListener('click', function (e) { e.preventDefault(); o.onClick(e); });
    this.overlay.appendChild(el);
    var m = { lat: lat, lng: lng, el: el };
    this.markers.push(m);
    this.render();
    return m;
  };
  MiniMap.prototype.removeMarker = function (m) {
    if (!m) return;
    m.el.remove();
    this.markers = this.markers.filter(function (x) { return x !== m; });
  };
  MiniMap.prototype.clearMarkers = function () { this.markers.forEach(function (m) { m.el.remove(); }); this.markers = []; this.closePopup(); };
  MiniMap.prototype.setCircle = function (lat, lng, km, cls) {
    this.circles.forEach(function (c) { c.el.remove(); });
    this.circles = [];
    if (!km) return this.render();
    var el = document.createElement('div');
    el.className = 'mm-circle ' + (cls || '');
    this.overlay.insertBefore(el, this.overlay.firstChild);
    this.circles.push({ lat: lat, lng: lng, km: km, el: el });
    this.render();
  };
  MiniMap.prototype.openPopup = function (lat, lng, html) {
    this.closePopup();
    var el = document.createElement('div');
    el.className = 'mm-popup';
    el.innerHTML = html + '<button type="button" class="mm-popup-x" aria-label="Zamknij">×</button>';
    var self = this;
    el.querySelector('.mm-popup-x').addEventListener('click', function () { self.closePopup(); });
    this.overlay.appendChild(el);
    this.popup = { lat: lat, lng: lng, el: el };
    this.render();
  };
  MiniMap.prototype.closePopup = function () { if (this.popup) { this.popup.el.remove(); this.popup = null; } };

  window.MiniMap = MiniMap;
  window.MiniMap.kmBetween = function (a, b) {
    var R = 6371, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLng = ((b[1] - a[1]) * Math.PI) / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  };
})();
