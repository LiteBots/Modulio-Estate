const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'manager', 'agent'], default: 'agent' },
    title: String,
    bio: String,
    phone: String,
    showOnSite: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const InviteSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, enum: ['manager', 'agent'], default: 'agent' },
    token: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const AgencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    verified: { type: Boolean, default: true },
    logo: String,
    cover: String,
    shortDescription: { type: String, maxlength: 240 },
    about: { type: String, maxlength: 8000 },
    address: String,
    city: String, // slug miasta
    voivodeship: String,
    serviceAreas: [String], // slugi miast obsługiwanych przez biuro
    phone: String,
    email: String,
    website: String,
    nip: String,
    licenseInfo: String, // np. ubezpieczenie OC pośrednika
    openingHours: String,
    socials: { facebook: String, instagram: String, linkedin: String, youtube: String, tiktok: String },
    brandColor: { type: String, default: '#17221d' },
    // Plan ustalany wyłącznie przez administratora po rozmowie z biurem (brak publicznych pakietów).
    plan: {
      name: { type: String, default: 'Partner' },
      microsite: { type: Boolean, default: false },
      maxListings: { type: Number, default: 50 },
      maxAgents: { type: Number, default: 5 },
      featuredSlots: { type: Number, default: 3 },
      bumpsPerMonth: { type: Number, default: 10 },
      xmlImport: { type: Boolean, default: false },
      validUntil: Date,
      notes: String
    },
    usage: {
      bumpsMonth: { type: String, default: '' },
      bumpsUsed: { type: Number, default: 0 }
    },
    microsite: {
      enabled: { type: Boolean, default: false },
      headline: String,
      subheadline: String,
      showTeam: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      showContact: { type: Boolean, default: true },
      highlights: [String], // np. "15 lat na rynku", "Ponad 600 transakcji"
      seoTitle: String,
      seoDescription: String,
      customDomain: String
    },
    members: [MemberSchema],
    invites: [InviteSchema],
    partnerRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerRequest' }
  },
  { timestamps: true }
);

AgencySchema.methods.memberRole = function (userId) {
  const m = this.members.find((x) => String(x.user && x.user._id ? x.user._id : x.user) === String(userId));
  return m ? m.role : null;
};
AgencySchema.virtual('hasMicrosite').get(function () {
  const valid = !this.plan.validUntil || this.plan.validUntil > new Date();
  return this.status === 'active' && this.plan.microsite && this.microsite.enabled && valid;
});

module.exports = mongoose.models.Agency || mongoose.model('Agency', AgencySchema);
