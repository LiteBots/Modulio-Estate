const mongoose = require('mongoose');

// Zgłoszenia z formularzy "Zostań partnerem" i "Reklama"
const PartnerRequestSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['biuro', 'deweloper', 'reklama', 'inne'], default: 'biuro', index: true },
    company: String,
    name: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    city: String,
    agentsCount: String,
    listingsCount: String,
    interests: [String],
    message: { type: String, maxlength: 4000 },
    status: { type: String, enum: ['nowe', 'kontakt', 'umowa', 'odrzucone'], default: 'nowe', index: true },
    adminNotes: String,
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.PartnerRequest || mongoose.model('PartnerRequest', PartnerRequestSchema);
