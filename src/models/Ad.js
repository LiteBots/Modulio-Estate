const mongoose = require('mongoose');
const { AD_PLACEMENTS } = require('../config/property');

const AdSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    advertiser: String,
    placement: { type: String, enum: Object.keys(AD_PLACEMENTS), required: true, index: true },
    image: String,
    imageMobile: String,
    headline: String,
    text: String,
    cta: String,
    url: String,
    cities: [String], // puste = cały region
    voivodeships: [String],
    startsAt: Date,
    endsAt: Date,
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Ad || mongoose.model('Ad', AdSchema);
