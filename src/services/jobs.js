// Zadania cykliczne (co godzinę): wygaszanie ogłoszeń i powiadomienia o nowych ofertach z zapisanych wyszukiwań.
const { Listing, SavedSearch, User } = require('../models');
const search = require('./search');
const mailer = require('./mailer');
const seo = require('./seo');
const fmt = require('../utils/format');

async function expireListings() {
  const r = await Listing.updateMany({ status: 'active', expiresAt: { $lt: new Date() } }, { status: 'archived', featuredUntil: null });
  if (r.modifiedCount) console.log(`[jobs] zarchiwizowano ${r.modifiedCount} wygasłych ogłoszeń`);
}

function parseSaved(url) {
  const u = new URL(url, 'http://x');
  const [, transaction, typeSlug, locationSlug] = u.pathname.split('/');
  const query = {};
  u.searchParams.forEach((v, k) => (query[k] = query[k] ? [].concat(query[k], v) : v));
  return search.parse({ transaction, typeSlug, locationSlug, query });
}

async function notifySavedSearches() {
  if (!mailer.enabled()) return;
  const now = new Date();
  const dayAgo = new Date(now - 20 * 3600e3);
  const list = await SavedSearch.find({ $or: [{ notify: 'instant' }, { notify: 'daily', lastSeenAt: { $lt: dayAgo } }] }).limit(500);
  for (const s of list) {
    try {
      const user = await User.findById(s.user);
      if (!user || !user.notifyEmail || user.blocked) continue;
      const f = parseSaved(s.url);
      const filter = { ...search.mongoFilter(f), publishedAt: { $gt: s.lastSeenAt } };
      const items = (await Listing.find(filter).sort({ publishedAt: -1 }).limit(10).lean()).map(search.withUrl);
      s.lastSeenAt = now;
      await s.save();
      if (!items.length) continue;
      const rows = items.map((l) => `<li style="margin:0 0 10px"><a href="${seo.abs(l.url)}" style="color:#17221d;font-weight:bold">${fmt.escapeHtml(l.title)}</a><br><span style="color:#5f6b65">${fmt.escapeHtml(l.cityName)} · ${fmt.price(l.price, l.transaction)}${l.area ? ' · ' + fmt.num(l.area) + ' m²' : ''}</span></li>`).join('');
      await mailer.send({
        to: user.email,
        subject: `Nowe oferty: ${s.name}`,
        html: mailer.layout(`${items.length} ${fmt.plural(items.length, 'nowa oferta', 'nowe oferty', 'nowych ofert')}`, `<p>Pasują do wyszukiwania „${fmt.escapeHtml(s.name)}”:</p><ul style="padding-left:18px">${rows}</ul><p><a href="${seo.abs(s.url)}">Zobacz wszystkie</a> · <a href="${seo.abs('/panel/wyszukiwania')}">zarządzaj powiadomieniami</a></p>`)
      });
    } catch (e) {
      console.error('[jobs] alert', s._id, e.message);
    }
  }
}

async function tick() {
  try {
    await expireListings();
    await notifySavedSearches();
  } catch (e) {
    console.error('[jobs]', e.message);
  }
}

function start() {
  if (process.env.DISABLE_JOBS === 'true') return;
  setTimeout(tick, 60 * 1000);
  setInterval(tick, Number(process.env.JOBS_INTERVAL_MIN || 60) * 60 * 1000);
}

module.exports = { start, tick, parseSaved };
