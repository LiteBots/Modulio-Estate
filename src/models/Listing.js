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
    buildingType: String,
    condition: String,
    heating: String,
    ownership: String,
    plotType: String,
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
ListingSchema.index({ title: 'text', description: 'text', district: 'text', street: 'text', cityName: 'text' }, { default_language: 'none', weights: { title: 5, district: 4, cityName: 4, street: 2, description: 1 } });

ListingSchema.pre('save', function (next) {
  if (this.area && this.price) this.pricePerM2 = Math.round(this.price / this.area);
  else this.pricePerM2 = undefined;
  this.slug = slugify(this.title, 80) || 'oferta';
  if (this.status === 'active' && !this.publishedAt) this.publishedAt = new Date();
  next();
});

ListingSchema.virtual('url').get(function () {
  return `/oferta/${this.slug || 'oferta'}-${this.num}`;
});
ListingSchema.virtual('isFeatured').get(function () {
  return !!(this.featuredUntil && this.featuredUntil > new Date());
});

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
