// Wykresy SVG renderowane na serwerze (bez bibliotek JS).
const { num } = require('../utils/format');

function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

/**
 * series: [{ name, color, values: [number] }], labels: [string]
 */
function lineChart({ labels, series, height = 260, width = 720, yFormat = (v) => num(v), area = true, minZero = true }) {
  const L = 56, R = 16, T = 16, B = 34;
  const all = series.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined);
  const rawMax = all.length ? Math.max(...all) : 1;
  const rawMin = all.length ? Math.min(...all) : 0;
  const max = niceMax(rawMax * 1.05);
  const min = minZero ? 0 : Math.max(0, Math.floor((rawMin * 0.9) / (max / 4)) * (max / 4));
  const n = Math.max(labels.length - 1, 1);
  const x = (i) => L + (i * (width - L - R)) / n;
  const y = (v) => T + (1 - (v - min) / (max - min || 1)) * (height - T - B);
  let s = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Wykres">`;
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    s += `<line x1="${L}" x2="${width - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="chart-grid"/>`;
    s += `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="chart-label">${yFormat(v)}</text>`;
  }
  const step = Math.ceil(labels.length / 10);
  labels.forEach((lb, i) => {
    if (i % step === 0 || i === labels.length - 1) s += `<text x="${x(i).toFixed(1)}" y="${height - 10}" text-anchor="middle" class="chart-label">${lb}</text>`;
  });
  series.forEach((se, si) => {
    const pts = se.values.map((v, i) => `${x(i).toFixed(1)},${y(v || 0).toFixed(1)}`).join(' ');
    if (area && si === 0) s += `<polygon points="${x(0).toFixed(1)},${y(min).toFixed(1)} ${pts} ${x(se.values.length - 1).toFixed(1)},${y(min).toFixed(1)}" fill="${se.color}" opacity=".10"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.color}" stroke-width="${si === 0 ? 3 : 2.25}" stroke-linejoin="round" stroke-linecap="round"/>`;
    se.values.forEach((v, i) => {
      const last = i === se.values.length - 1;
      s += `<circle cx="${x(i).toFixed(1)}" cy="${y(v || 0).toFixed(1)}" r="${last ? 4.5 : 2.5}" fill="${last ? se.color : '#fff'}" stroke="${se.color}" stroke-width="2"><title>${se.name} · ${labels[i]}: ${yFormat(v || 0)}</title></circle>`;
    });
  });
  return s + '</svg>';
}

function barChart({ labels, values, color = '#4f7560', height = 220, width = 720, yFormat = (v) => num(v) }) {
  const L = 56, R = 12, T = 12, B = 30;
  const max = niceMax(Math.max(1, ...values) * 1.05);
  const bw = (width - L - R) / values.length;
  const y = (v) => T + (1 - v / max) * (height - T - B);
  let s = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Wykres słupkowy">`;
  for (let k = 0; k <= 4; k++) {
    const v = (max * k) / 4;
    s += `<line x1="${L}" x2="${width - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="chart-grid"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="chart-label">${yFormat(v)}</text>`;
  }
  const step = Math.ceil(labels.length / 12);
  values.forEach((v, i) => {
    const x = L + i * bw + bw * 0.18;
    const h = y(0) - y(v);
    s += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" fill="${color}"><title>${labels[i]}: ${yFormat(v)}</title></rect>`;
    if (i % step === 0) s += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${height - 10}" text-anchor="middle" class="chart-label">${labels[i]}</text>`;
  });
  return s + '</svg>';
}

function sparkline(values, color = '#4f7560', w = 120, h = 36) {
  if (!values.length) return '';
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const x = (i) => (i * w) / Math.max(values.length - 1, 1);
  const y = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" aria-hidden="true"><polygon points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity=".12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

module.exports = { lineChart, barChart, sparkline };
