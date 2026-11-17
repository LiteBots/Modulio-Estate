const mongoose = require('mongoose');
const { AD_PLACEMENTS, AD_BILLING } = require('../config/property');

const PLACEMENT_KEYS = Object.keys(AD_PLACEMENTS);

const AdSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    advertiser: String,
    advertiserEmail: String,
    // Kampania może działać w kilku miejscach naraz. `placement` zostaje dla zgodności ze starszymi reklamami.
    placements: { type: [{ type: String, enum: PLACEMENT_KEYS }], index: true, default: [] },
    placement: { type: String, enum: PLACEMENT_KEYS, index: true },

    // kreacja
    image: String,
    imageMobile: String,
    headline: String,
    text: String,
    cta: String,
    url: String,

    // kierowanie – puste pole = bez ograniczeń
    cities: [String],
    voivodeships: [String],
    area: {
      lat: Number,
      lng: Number,
      radiusKm: Number, // reklama tylko przy ofertach / stronach w tym promieniu
      label: String
    },
    types: [String], // rodzaje nieruchomości (klucze z TYPES)
    transactions: [String], // sprzedaz / wynajem
    markets: [String], // pierwotny / wtorny
    priceMin: Number,
    priceMax: Number,
    devices: [String], // desktop / mobile
    days: [Number], // 0 = niedziela … 6 = sobota
    hourFrom: Number, // 0–23
    hourTo: Number, // 1–24

    // harmonogram i limity
    startsAt: Date,
    endsAt: Date,
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    maxImpressions: Number, // po osiągnięciu kampania przestaje się wyświetlać
    maxPerDayPerVisitor: Number, // ile razy dziennie jedna osoba może zobaczyć reklamę

    // rozliczenie (informacyjnie dla administratora)
    billing: { type: String, enum: Object.keys(AD_BILLING), default: 'flat' },
    price: Number, // zł: miesięcznie / za 1000 wyświetleń / za kliknięcie
    notes: String,

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AdSchema.virtual('allPlacements').get(function () {
  const list = (this.placements || []).slice();
  if (this.placement && !list.includes(this.placement)) list.push(this.placement);
  return list;
});

// Szacowany przychód z kampanii w bieżącym okresie (dla panelu admina).
AdSchema.statics.revenueOf = function (ad) {
  if (!ad || !ad.price) return 0;
  if (ad.billing === 'cpm') return Math.round(((ad.impressions || 0) / 1000) * ad.price);
  if (ad.billing === 'cpc') return Math.round((ad.clicks || 0) * ad.price);
  if (ad.billing === 'flat') return ad.price;
  return 0;
};

module.exports = mongoose.models.Ad || mongoose.model('Ad', AdSchema);
