const mongoose = require('mongoose');

// Zgłoszenia naruszeń (mechanizm zgłaszania treści wymagany przez DSA)
const ReportSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    reason: { type: String, enum: ['oszustwo', 'nieaktualne', 'bledne_dane', 'nielegalne', 'duplikat', 'inne'] },
    details: { type: String, maxlength: 3000 },
    email: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['nowe', 'rozpatrzone', 'odrzucone'], default: 'nowe' },
    decision: String
  },
  { timestamps: true }
);

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
