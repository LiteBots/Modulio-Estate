const NBSP = ' ';

function num(n, digits = 0) {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '–';
  const fixed = Number(n).toFixed(digits);
  const [i, d] = fixed.split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + (d ? ',' + d : '');
}

function price(n, transaction) {
  if (!n && n !== 0) return 'Cena do uzgodnienia';
  return `${num(n)}${NBSP}zł${transaction === 'wynajem' ? '/mc' : ''}`;
}

function shortPrice(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace('.', ',').replace(/,?0+$/, '') + ' mln';
  if (n >= 1e3) return Math.round(n / 1e3) + ' tys.';
  return String(n);
}

// Polska odmiana: 1 oferta, 2 oferty, 5 ofert
function plural(n, one, few, many) {
  const a = Math.abs(n);
  if (a === 1) return one;
  const d = a % 10, h = a % 100;
  if (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) return few;
  return many;
}

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
function date(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}
function dateShort(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
}
function dateTime(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${dateShort(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}
function inputDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}
function inputDateTime(d) {
  if (!d) return '';
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16);
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'przed chwilą';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${plural(m, 'minutę', 'minuty', 'minut')} temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${plural(h, 'godzinę', 'godziny', 'godzin')} temu`;
  const dd = Math.floor(h / 24);
  if (dd === 1) return 'wczoraj';
  if (dd < 30) return `${dd} dni temu`;
  return dateShort(d);
}

function floorLabel(f, total) {
  if (f === null || f === undefined || f === '') return '';
  const base = f === 0 ? 'parter' : `${f} piętro`;
  return total ? `${base} / ${total}` : base;
}

function truncate(s, n = 160) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Prosty, bezpieczny "markdown": akapity i listy z myślnikami
function paragraphs(text) {
  const blocks = String(text || '').split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => /^[-•*]\s+/.test(l))) {
        return '<ul>' + lines.map((l) => `<li>${escapeHtml(l.replace(/^[-•*]\s+/, ''))}</li>`).join('') + '</ul>';
      }
      return lines.length ? `<p>${lines.map(escapeHtml).join('<br>')}</p>` : '';
    })
    .join('');
}

function dayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

module.exports = { num, price, shortPrice, plural, date, dateShort, dateTime, inputDate, inputDateTime, timeAgo, floorLabel, truncate, escapeHtml, paragraphs, dayKey };
