const mongoose = require('mongoose');
const { slugify } = require('../utils/slug');
const { TYPE_BY_KEY } = require('../config/property');

const ImageSchema = new mongoose.Schema({ url: String, alt: String }, { _id: false });

const ListingSchema = new mongoose.Schema(
  {
    num: { type: Number, unique: true, index: true }, // krótki numer oferty w adresie URL
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: String,
    description: { type: String, maxlength: 12000 },
    transaction: { type: String, enum: ['sprzedaz', 'wynajem'], required: true, index: true },
    type: { type: String, enum: Object.keys(TYPE_BY_KEY), required: true, index: true },
    market: { type: String, enum: ['pierwotny', 'wtorny'], default: 'wtorny' },

    price: { type: Number, required: true, min: 0 },
    pricePerM2: Number,
    negotiable: { type: Boolean, default: false },
    rentExtra: Number, // czynsz administracyjny / opłaty
    deposit: Number,

    area: { type: Number, min: 0 },
    plotArea: Number,
    rooms: Number,
    floor: Number, // 0 = parter
    floorsTotal: Number,
    yearBuilt: Number,
    bathrooms: Number,
    buildingType: String,
    buildingMaterial: String,
    condition: String, // stan wykończenia
    heating: String,
    ownership: String,
    plotType: String,
    windows: String,
    kitchen: String,
    parking: String,
    energyClass: String,
    energyKwh: Number, // zapotrzebowanie EP kWh/m²rok
    balconyArea: Number,
    roof: String,
    access: String, // dojazd (działki, domy)
    plotWidth: Number,
    plotLength: Number,
    rentFor: String,
    minRentMonths: Number,
    advertiserType: { type: String, enum: ['prywatny', 'biuro', 'deweloper'], default: 'prywatny', index: true },
    availableFrom: Date,
    features: [String],

    voivodeship: { type: String, enum: ['pomorskie', 'zachodniopomorskie'], required: true, index: true },
    city: { type: String, required: true, index: true }, // slug
    cityName: String,
    district: String,
    street: String,
    showExactAddress: { type: Boolean, default: false },
    lat: Number,
    lng: Number,
    geo: { type: { type: String, enum: ['Point'] }, coordinates: [Number] }, // [lng, lat] – wyszukiwanie w promieniu
    geoPrecise: { type: Boolean, default: false }, // true = współrzędne adresu, false = środek miejscowości

    images: [ImageSchema],
    videoUrl: String,
    virtualTourUrl: String,

    status: { type: String, enum: ['draft', 'active', 'reserved', 'sold', 'archived', 'blocked'], default: 'active', index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refNumber: String, // własny numer oferty biura
    contactName: String,
    contactPhone: String,
    contactEmail: String,
    noCommission: { type: Boolean, default: false },

    featuredUntil: { type: Date, index: true },
    bumpedAt: { type: Date, default: Date.now, index: true },
    publishedAt: Date,
    expiresAt: Date,

    priceHistory: [{ price: Number, at: { type: Date, default: Date.now } }],
    views: { type: Number, default: 0 },
    phoneReveals: { type: Number, default: 0 },
    inquiriesCount: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    moderationNote: String
  },
  { timestamps: true }
);

ListingSchema.index({ status: 1, transaction: 1, type: 1, city: 1, price: 1 });
ListingSchema.index({ status: 1, voivodeship: 1, bumpedAt: -1 });
ListingSchema.index({ geo: '2dsphere' });
ListingSchema.index({ title: 'text', description: 'text', district: 'text', street: 'text', cityName: 'text' }, { default_language: 'none', weights: { title: 5, district: 4, cityName: 4, street: 2, description: 1 } });

ListingSchema.pre('save', function (next) {
  const { getCity } = require('../config/locations');
  // punkt na mapie: dokładny adres albo środek miejscowości
  let lat = this.lat, lng = this.lng;
  if (!(lat && lng)) {
    const c = getCity(this.city);
    if (c && c.lat) { lat = c.lat; lng = c.lng; }
  }
  if (lat && lng) this.geo = { type: 'Point', coordinates: [lng, lat] };
  this.geoPrecise = !!(this.lat && this.lng);
  // historia ceny
  if (this.isNew || this.isModified('price')) {
    const last = (this.priceHistory || [])[this.priceHistory.length - 1];
    if (!last || last.price !== this.price) this.priceHistory.push({ price: this.price, at: new Date() });
    if (this.priceHistory.length > 20) this.priceHistory = this.priceHistory.slice(-20);
  }
  if (this.area && this.price) this.pricePerM2 = Math.round(this.price / this.area);
  else this.pricePerM2 = undefined;
  this.slug = slugify(this.title, 80) || 'oferta';
  if (this.status === 'active' && !this.publishedAt) this.publishedAt = new Date();
  next();
});

ListingSchema.virtual('url').get(function () {
  return `/oferta/${this.slug || 'oferta'}-${this.num}`;
});
ListingSchema.virtual('priceDrop').get(function () {
  const h = this.priceHistory || [];
  if (h.length < 2) return 0;
  const max = Math.max(...h.map((x) => x.price));
  return max > this.price ? Math.round((1 - this.price / max) * 100) : 0;
});
ListingSchema.virtual('isFeatured').get(function () {
  return !!(this.featuredUntil && this.featuredUntil > new Date());
});

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
