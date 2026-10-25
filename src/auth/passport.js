const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

async function promoteIfAdmin(user) {
  if (adminEmails().includes(user.email) && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  return user;
}

passport.serializeUser((user, done) => done(null, String(user._id)));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user || user.blocked) return done(null, false);
    done(null, user);
  } catch (e) {
    done(e);
  }
});

passport.use(
  new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (!user || !(await user.checkPassword(password))) return done(null, false, { message: 'Nieprawidłowy e-mail lub hasło.' });
      if (user.blocked) return done(null, false, { message: 'Konto zostało zablokowane. Skontaktuj się z nami.' });
      user.lastLoginAt = new Date();
      await user.save();
      return done(null, await promoteIfAdmin(user));
    } catch (e) {
      return done(e);
    }
  })
);

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (googleEnabled) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${base}/auth/google/callback`
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value.toLowerCase();
          if (!email) return done(null, false, { message: 'Google nie udostępnił adresu e-mail.' });
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
          if (!user) {
            user = new User({ email, name: profile.displayName, googleId: profile.id, avatar: profile.photos && profile.photos[0] && profile.photos[0].value, acceptedTermsAt: new Date() });
          } else {
            user.googleId = user.googleId || profile.id;
            if (!user.avatar && profile.photos && profile.photos[0]) user.avatar = profile.photos[0].value;
            if (!user.name) user.name = profile.displayName;
          }
          if (user.blocked) return done(null, false, { message: 'Konto zostało zablokowane.' });
          user.lastLoginAt = new Date();
          await user.save();
          return done(null, await promoteIfAdmin(user));
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

module.exports = { passport, googleEnabled, promoteIfAdmin };
