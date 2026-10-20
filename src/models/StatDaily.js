const mongoose = require('mongoose');

// Dzienne statystyki ogłoszeń (wyświetlenia, telefony, zapytania) – wykresy w panelach.
const StatDailySchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
  agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  day: { type: String, index: true }, // YYYY-MM-DD
  views: { type: Number, default: 0 },
  phone: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 }
});
StatDailySchema.index({ listing: 1, day: 1 }, { unique: true });

module.exports = mongoose.models.StatDaily || mongoose.model('StatDaily', StatDailySchema);
