const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    googleId: { type: String, index: true, sparse: true },
    avatar: String,
    phone: { type: String, trim: true, maxlength: 40 },
    city: String,
    // user – klient / osoba prywatna, agent – pracownik biura, admin – administrator platformy
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user', index: true },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', index: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
    marketingConsent: { type: Boolean, default: false },
    notifyEmail: { type: Boolean, default: true },
    resetToken: String,
    resetExpires: Date,
    blocked: { type: Boolean, default: false },
    lastLoginAt: Date,
    acceptedTermsAt: Date
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};
UserSchema.methods.checkPassword = function (plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};
UserSchema.virtual('initials').get(function () {
  const src = (this.name || this.email || '?').trim();
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
});
UserSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
