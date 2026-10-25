// ModulioEstate – serwer aplikacji (Express + EJS + MongoDB)
require('dotenv').config();

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');

const { connectDB } = require('./src/db');
const { passport } = require('./src/auth/passport');
const { flash, locals } = require('./src/middleware/locals');
const { csrfLocals, csrfGuard } = require('./src/middleware/csrf');
const { UPLOAD_DIR } = require('./src/services/upload');

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

async function start() {
  await connectDB();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layout');
  app.set('layout extractScripts', false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'frame-src': ['https://www.openstreetmap.org', 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://my.matterport.com'],
          'form-action': ["'self'", 'https://accounts.google.com'],
          'upgrade-insecure-requests': isProd ? [] : null
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' }
    })
  );
  app.use(compression());

  // Przekierowanie na kanoniczną domenę (np. bez www) – ustaw SITE_URL w Railway
  if (isProd && process.env.SITE_URL) {
    const canonicalHost = new URL(process.env.SITE_URL).host;
    app.use((req, res, next) => {
      if (req.hostname && req.get('host') !== canonicalHost && !req.get('host').endsWith('.railway.internal') && req.path !== '/health') {
        return res.redirect(301, process.env.SITE_URL.replace(/\/$/, '') + req.originalUrl);
      }
      next();
    });
  }

  app.get('/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
  // Pliki z ?v=<skrót> mogą być cache'owane długo; reszta krótko
  app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res, file) => res.setHeader('Cache-Control', isProd && /\.(css|js)$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600') }));
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', fallthrough: true }));
  app.get('/favicon.ico', (req, res) => res.redirect(301, '/img/favicon-64.png'));

  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.json({ limit: '1mb' }));

  if (!process.env.SESSION_SECRET) console.warn('[uwaga] Brak SESSION_SECRET – ustaw losowy ciąg w Railway → Variables.');
  app.use(
    session({
      name: 'me.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-zmien-mnie',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: require('./src/db').mongoUri(), dbName: process.env.MONGODB_DB || undefined, collectionName: 'sessions', ttl: 60 * 60 * 24 * 14, touchAfter: 3600 }),
      cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 1000 * 60 * 60 * 24 * 14 }
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash);
  app.use(locals);
  app.use(csrfLocals);
  app.use(csrfGuard);

  app.use('/', require('./src/routes/seo'));
  app.use('/', require('./src/routes/auth'));
  app.use('/panel', require('./src/routes/panel'));
  app.use('/biuro-panel', require('./src/routes/agency'));
  app.use('/admin', require('./src/routes/admin'));
  app.use('/', require('./src/routes/public'));

  app.use((req, res) => {
    res.status(404).render('pages/error', { code: 404, message: 'Nie znaleźliśmy tej strony. Sprawdź adres albo skorzystaj z wyszukiwarki.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      req.flash && req.flash('error', 'Plik jest za duży (maks. 10 MB na zdjęcie).');
      return res.redirect(req.get('referer') || '/');
    }
    console.error('[błąd]', req.method, req.originalUrl, err);
    const status = err.status || 500;
    try {
      res.status(status).render('pages/error', { code: status, message: status === 500 ? 'Coś poszło nie tak. Spróbuj ponownie za chwilę.' : err.message });
    } catch (e) {
      res.status(status).send('Błąd serwera');
    }
  });

  app.listen(PORT, () => console.log(`[www] ModulioEstate działa na porcie ${PORT}`));
  require('./src/services/jobs').start();
}

start().catch((e) => {
  console.error('[start] Nie udało się uruchomić aplikacji:', e.message);
  process.exit(1);
});
