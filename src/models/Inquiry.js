const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
  { author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, authorName: String, text: String, at: { type: Date, default: Date.now } },
  { _id: true }
);
const ReplySchema = new mongoose.Schema(
  { author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, authorName: String, side: { type: String, enum: ['client', 'seller'] }, text: String, at: { type: Date, default: Date.now } },
  { _id: true }
);

// Zapytanie / lead: od osoby zainteresowanej do biura lub właściciela prywatnego ogłoszenia.
const InquirySchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    message: { type: String, maxlength: 4000 },
    topic: { type: String, enum: ['oferta', 'prezentacja', 'wycena', 'kontakt'], default: 'oferta' },
    status: { type: String, enum: ['nowe', 'w_kontakcie', 'prezentacja', 'negocjacje', 'sukces', 'zamkniete'], default: 'nowe', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    presentationAt: Date,
    notes: [NoteSchema],
    replies: [ReplySchema],
    readBySeller: { type: Boolean, default: false },
    readByClient: { type: Boolean, default: true },
    source: { type: String, default: 'formularz' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
