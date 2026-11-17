const mongoose = require('mongoose');

const SavedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: String,
    url: String, // pełny adres wyszukiwania, np. /sprzedaz/mieszkania/slupsk?cena_do=500000
    notify: { type: String, enum: ['off', 'daily', 'instant'], default: 'daily' },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.SavedSearch || mongoose.model('SavedSearch', SavedSearchSchema);
