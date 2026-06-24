const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const methodOverride = require('method-override');
const { sequelize, HeroSlide } = require('./models');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = new SequelizeStore({ db: sequelize });

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

// sync session store separately
sessionStore.sync();

// Middleware to expose user to views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cartCount = (req.session.cart || []).reduce((s, it) => s + (it.quantity || 0), 0);
  next();
});

app.use('/', shopRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Start server: sync DB (seed moved to scripts/seed.js)

// Start server: sync DB (seed moved to scripts/seed.js)
async function start() {
  // Use simple sync to avoid complex ALTER operations that can fail on SQLite backups.
  // We will add missing `users` columns explicitly for SQLite to be safe in dev.
  await sequelize.sync();
  try {
    if (sequelize.getDialect && sequelize.getDialect() === 'sqlite') {
      const [[info]] = await sequelize.query("PRAGMA table_info('users');");
      // If above query returned rows differently, normalize
      const cols = Array.isArray(info) ? info.map(r => r.name) : (Array.isArray(info) ? info.map(r=>r.name) : []);
      // Fallback: when the returned shape is array of rows
      const rows = Array.isArray(info) && info.length ? info : (Array.isArray((await sequelize.query("PRAGMA table_info('users');"))[0]) ? (await sequelize.query("PRAGMA table_info('users');"))[0] : []);
      const colNames = rows.map(r => r.name);
      const addIfMissing = async (name, sqlType) => {
        if (!colNames.includes(name)) {
          try {
            await sequelize.query(`ALTER TABLE users ADD COLUMN ${name} ${sqlType};`);
            console.log('Added column', name);
          } catch (err) {
            console.warn('Failed adding column', name, err && err.message);
          }
        }
      };
      await addIfMissing('address', 'TEXT');
      await addIfMissing('phone', 'TEXT');
      await addIfMissing('lat', 'DECIMAL(10,8)');
      await addIfMissing('lng', 'DECIMAL(11,8)');
    }
  } catch (err) {
    console.warn('Error while ensuring user columns exist:', err && err.message);
  }
  // ensure there are 3 hero slides
  try {
    const cnt = await HeroSlide.count();
    if (cnt < 3) {
      console.log('Seeding default hero slides...');
      const defaults = [
        { title: 'Bienvenidos a la tienda', subtitle: 'Ofertas y productos destacados seleccionados para ti.', button_text: 'Comprar ahora', button_link: '/', image_url: '/images/placeholder.png', display_order: 0 },
        { title: 'Nuevos lanzamientos', subtitle: 'Explora los últimos productos', button_text: 'Ver novedades', button_link: '/?sort=price_desc', image_url: '/images/placeholder.png', display_order: 1 },
        { title: 'Ofertas especiales', subtitle: 'Ofertas por tiempo limitado', button_text: 'Ver ofertas', button_link: '/?sort=price_asc', image_url: '/images/placeholder.png', display_order: 2 }
      ];
      for (let i = 0; i < defaults.length; i++) {
        const d = defaults[i];
        await HeroSlide.findOrCreate({ where: { display_order: d.display_order }, defaults: d });
      }
    }
  } catch (err) { console.warn('hero seed check failed', err && err.message); }

  app.listen(PORT, () => console.log('Server listening on http://localhost:' + PORT));
}

if (require.main === module) {
  start();
}

module.exports = app;
