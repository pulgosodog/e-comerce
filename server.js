const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const methodOverride = require('method-override');
const { Op } = require('sequelize');
const { sequelize, Product, Category, User, Cart, CartItem, Order, OrderItem, HeroSlide } = require('./models');
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const multer = require('multer');

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

// multer storage for admin uploads
const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({ storage });

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  // if request expects HTML, redirect; if AJAX/JSON, return 403
  if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) return res.status(403).json({ success: false, message: 'Forbidden' });
  return res.redirect('/');
}

// Home: list products with optional sorting
app.get('/', async (req, res) => {
  const sort = req.query.sort || '';
  const categoryId = req.query.category ? parseInt(req.query.category, 10) : null;
  let order = [];
  if (sort === 'price_asc') order = [['price_regular', 'ASC']];
  if (sort === 'price_desc') order = [['price_regular', 'DESC']];
  const where = {};
  if (categoryId) where.category_id = categoryId;

  const products = await Product.findAll({ where, include: ['category'], order });
  const categories = await Category.findAll();
  const selectedCategory = categoryId ? await Category.findByPk(categoryId) : null;
  // load hero slides (3 expected)
  const slides = await HeroSlide.findAll({ order: [['display_order','ASC']], limit: 3 });
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), { products, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Deals: list products on sale
app.get('/deals', async (req, res) => {
  const sort = req.query.sort || '';
  let order = [];
  if (sort === 'price_asc') order = [['price_regular', 'ASC']];
  if (sort === 'price_desc') order = [['price_regular', 'DESC']];

  const products = await Product.findAll({ where: { is_on_sale: true }, include: ['category'], order });
  const filtered = products.filter(p => p.price_sale !== null && p.price_sale !== undefined);
  const categories = await Category.findAll();
  const selectedCategory = { name: 'Ofertas', category_id: '' };
  const slides = await HeroSlide.findAll({ order: [['display_order','ASC']], limit: 3 });
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), { products: filtered, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Search by brand or product name
app.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const sort = req.query.sort || '';
  let order = [];
  if (sort === 'price_asc') order = [['price_regular', 'ASC']];
  if (sort === 'price_desc') order = [['price_regular', 'DESC']];

  let products = [];
  if (q && q.length >= 2) {
    products = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { brand: { [Op.like]: `%${q}%` } }
        ]
      },
      include: ['category'],
      order
    });
  }
  const categories = await Category.findAll();
  const selectedCategory = { name: q ? `Resultados para "${q}"` : 'Búsqueda', category_id: '' };
  const slides = await HeroSlide.findAll({ order: [['display_order','ASC']], limit: 3 });
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), { products, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Categories list (JSON) for dropdown
app.get('/categories/list', async (req, res) => {
  const categories = await Category.findAll();
  res.json(categories);
});

// Product detail page
app.get('/product/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).send('Invalid product id');
  const product = await Product.findByPk(id, { include: ['category'] });
  if (!product) return res.status(404).send('Product not found');
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'product.ejs'), { product, currentUser: req.session.user });
  res.render('layout', { body });
});

// Orders route: shows user orders, or admin panel when the current user is admin
app.get('/orders', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  // Admin sees the admin orders panel
  if (req.session.user.role === 'admin') {
    const orders = await Order.findAll({ order: [['created_at','DESC']], include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: User, as: 'user' }
    ] });
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'admin_orders.ejs'), { orders, currentUser: req.session.user });
    return res.render('layout', { body });
  }

  // Regular user: show only their orders
  const userId = req.session.user.id;
  const orders = await Order.findAll({ where: { user_id: userId }, order: [['created_at','DESC']], include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }] });
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'orders.ejs'), { orders, currentUser: req.session.user });
  res.render('layout', { body });
});

// Admin: list and edit users
app.get('/admin/users', isAdmin, async (req, res) => {
  const users = await User.findAll({ order: [['id','ASC']] });
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'admin_users.ejs'), { users, currentUser: req.session.user });
  res.render('layout', { body });
});

app.post('/admin/users/:id', isAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.redirect('/admin/users');
  try {
    const user = await User.findByPk(id);
    if (!user) return res.redirect('/admin/users');
    const { name, email, role, new_password } = req.body;
    if (typeof name !== 'undefined') user.name = name;
    if (typeof email !== 'undefined') user.email = email;
    if (typeof role !== 'undefined') user.role = role;
    if (new_password && new_password.trim()) {
      const hash = await bcrypt.hash(new_password.trim(), 10);
      user.password_hash = hash;
    }
    await user.save();
  } catch (err) {
    console.warn('Admin user update failed', err && err.message);
  }
  res.redirect('/admin/users');
});

// Admin: update order status (admin-only). The navbar `GET /orders` will show admin panel when role==='admin'.
app.post('/orders/:id/status', isAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (isNaN(id)) return res.redirect('/orders');
  try {
    const ord = await Order.findByPk(id);
    if (!ord) return res.redirect('/orders');
    ord.status = status || ord.status;
    await ord.save();
  } catch (err) {
    console.warn('Failed updating order status', err && err.message);
  }
  res.redirect('/orders');
});

// Auth routes
app.get('/login', async (req, res) => {
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { currentUser: req.session.user });
  res.render('layout', { body });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  // set session user, include role
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };

  // load persisted cart from DB into session if present
  try {
    const dbCart = await Cart.findOne({ where: { user_id: user.id } });
    if (dbCart) {
      const dbItems = await CartItem.findAll({ where: { cart_id: dbCart.cart_id } });
      req.session.cart = dbItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
    } else {
      if (!req.session.cart) req.session.cart = [];
    }
  } catch (err) {
    console.warn('Failed to load DB cart into session:', err && err.message);
    if (!req.session.cart) req.session.cart = [];
  }

  res.json({ success: true });
});

app.get('/register', async (req, res) => {
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { currentUser: req.session.user });
  res.render('layout', { body });
});

app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    const bodyHtml = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'Email already registered', currentUser: req.session.user });
    return res.status(400).render('layout', { body: bodyHtml });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash: hash, role: 'user' });
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };
  if (!req.session.cart) req.session.cart = [];
  res.redirect('/');
});

// Admin: create new product (image optional)
app.post('/admin/products', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price_regular, price_sale, stock, category_id, sku, brand } = req.body;
    let image_url = null;
    if (req.file) image_url = '/images/uploads/' + req.file.filename;
    const prod = await Product.create({
      name,
      description,
      price_regular: price_regular || 0,
      price_sale: price_sale || null,
      stock: parseInt(stock, 10) || 0,
      category_id: category_id ? parseInt(category_id, 10) : null,
      sku: sku || null,
      brand: brand || null,
      image_url
    });
    return res.json({ success: true, product: prod });
  } catch (err) {
    console.error('admin upload error', err && err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: update existing product (image optional)
app.post('/admin/products/:id', isAdmin, upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const prod = await Product.findByPk(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, description, price_regular, price_sale, stock, category_id, sku, brand } = req.body;
    if (typeof name !== 'undefined') prod.name = name;
    if (typeof description !== 'undefined') prod.description = description;
    if (typeof price_regular !== 'undefined') prod.price_regular = price_regular || 0;
    if (typeof price_sale !== 'undefined') prod.price_sale = price_sale || null;
    if (typeof stock !== 'undefined') prod.stock = parseInt(stock, 10) || 0;
    if (typeof category_id !== 'undefined') prod.category_id = category_id ? parseInt(category_id, 10) : null;
    if (typeof sku !== 'undefined') prod.sku = sku || null;
    if (typeof brand !== 'undefined') prod.brand = brand || null;
    if (req.file) prod.image_url = '/images/uploads/' + req.file.filename;
    await prod.save();
    return res.json({ success: true, product: prod });
  } catch (err) {
    console.error('admin product update error', err && err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: update hero slide (edit title, subtitle, button, image)
app.post('/admin/hero/:id', isAdmin, upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const slide = await HeroSlide.findByPk(id);
    if (!slide) return res.status(404).json({ success: false, message: 'Slide not found' });
    const { title, subtitle, button_text, button_link } = req.body;
    if (typeof title !== 'undefined') slide.title = title;
    if (typeof subtitle !== 'undefined') slide.subtitle = subtitle;
    if (typeof button_text !== 'undefined') slide.button_text = button_text;
    if (typeof button_link !== 'undefined') slide.button_link = button_link;
    if (req.file) slide.image_url = '/images/uploads/' + req.file.filename;
    await slide.save();
    return res.json({ success: true, slide });
  } catch (err) {
    console.error('hero update error', err && err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/auth/merge-cart', (req, res) => {
  // body: { items: [{productId, quantity}] }
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  // if client has no items, do not update server cart
  if (!items.length) return res.json({ success: true, cart: req.session.cart || [] });

  if (!req.session.cart) req.session.cart = [];
  const sessionCart = req.session.cart;
  // merge additively: sum quantities for matching items, preserve existing server-only items
  for (const it of items) {
    const found = sessionCart.find((s) => s.productId === it.productId);
    if (found) found.quantity += it.quantity; // additive
    else sessionCart.push({ productId: it.productId, quantity: it.quantity });
  }
  req.session.cart = sessionCart;

  // if user logged in, persist to DB cart as well (add quantities)
  (async () => {
    try {
      if (req.session.user) {
        const userId = req.session.user.id;
        const [cart] = await Cart.findOrCreate({ where: { user_id: userId } });
        for (const it of items) {
          const existing = await CartItem.findOne({ where: { cart_id: cart.cart_id, product_id: it.productId } });
          if (existing) {
            existing.quantity = (existing.quantity || 0) + it.quantity;
            await existing.save();
          } else {
            const prod = await Product.findByPk(it.productId);
            await CartItem.create({ cart_id: cart.cart_id, product_id: it.productId, quantity: it.quantity, unit_price: prod ? prod.price_regular : 0 });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to persist cart merge:', err && err.message);
    }
  })();

  res.json({ success: true, cart: sessionCart });
});

app.post('/cart/add', async (req, res) => {
  const { productId, quantity } = req.body;
  const q = parseInt(quantity, 10) || 1;
  const prod = await Product.findByPk(productId);
  if (!prod) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  if (prod.stock < q) return res.status(400).json({ success: false, message: 'Stock insuficiente' });

  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find((c) => c.productId === productId);
  const newQty = existing ? existing.quantity + q : q;
  if (prod.stock < newQty) return res.status(400).json({ success: false, message: 'Stock insuficiente para la cantidad total' });

  if (existing) existing.quantity += q;
  else req.session.cart.push({ productId, quantity: q });
  // persist to DB if user logged in
  if (req.session.user) {
    try {
      const userId = req.session.user.id;
      const [cart] = await Cart.findOrCreate({ where: { user_id: userId } });
      const existingItem = await CartItem.findOne({ where: { cart_id: cart.cart_id, product_id: productId } });
      if (existingItem) {
        existingItem.quantity += q;
        await existingItem.save();
      } else {
        await CartItem.create({ cart_id: cart.cart_id, product_id: productId, quantity: q, unit_price: prod.price_regular });
      }
      // reload cart items to return
      const dbItems = await CartItem.findAll({ where: { cart_id: cart.cart_id } });
      const cartSummary = dbItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
      req.session.cart = cartSummary;
    } catch (err) {
      console.warn('Failed to persist cart add:', err && err.message);
    }
  }

  res.json({ success: true, cart: req.session.cart });
});

// Show cart page (use session.cart to build items)
app.get('/cart', async (req, res) => {
  const sessionCart = req.session.cart || [];
  // sessionCart: [{productId, quantity}]
  const items = [];
  for (const it of sessionCart) {
    const prod = await Product.findByPk(it.productId);
    if (!prod) continue;
    items.push({ product: prod, quantity: it.quantity, unit_price: parseFloat(prod.price_regular) });
  }
  const subtotal = items.reduce((s, it) => s + (parseFloat(it.unit_price) * it.quantity), 0);
  const tax = +(subtotal * 0.12).toFixed(2); // example 12% IVA
  const totals = { subtotal, tax, total: +(subtotal + tax).toFixed(2) };
  const body = await ejs.renderFile(path.join(__dirname, 'views', 'cart.ejs'), { items, totals, currentUser: req.session.user });
  res.render('layout', { body });
});

// Update cart item quantity
app.post('/cart/update', async (req, res) => {
  const { productId, quantity } = req.body;
  const q = parseInt(quantity, 10) || 1;
  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(c => c.productId == productId);
  if (existing) existing.quantity = q;
  // persist to DB if user logged
  if (req.session.user) {
    try {
      const userId = req.session.user.id;
      const [cart] = await Cart.findOrCreate({ where: { user_id: userId } });
      const ci = await CartItem.findOne({ where: { cart_id: cart.cart_id, product_id: productId } });
      if (ci) {
        ci.quantity = q;
        await ci.save();
      }
    } catch (err) { console.warn('cart update persist failed', err && err.message); }
  }
  res.redirect('/cart');
});

// Remove item
app.post('/cart/remove', async (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(c => c.productId != productId);
  if (req.session.user) {
    try {
      const userId = req.session.user.id;
      const cart = await Cart.findOne({ where: { user_id: userId } });
      if (cart) await CartItem.destroy({ where: { cart_id: cart.cart_id, product_id: productId } });
    } catch (err) { console.warn('cart remove persist failed', err && err.message); }
  }
  res.redirect('/cart');
});

// Checkout -> create Order and OrderItems
app.post('/cart/checkout', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  const sessionCart = req.session.cart || [];
  if (!sessionCart.length) return res.redirect('/cart');
  // build items and totals
  const items = [];
  let subtotal = 0;
  for (const it of sessionCart) {
    const prod = await Product.findByPk(it.productId);
    if (!prod) continue;
    const price = parseFloat(prod.price_regular);
    items.push({ product_id: prod.product_id, quantity: it.quantity, unit_price: price });
    subtotal += price * it.quantity;
  }
  const tax = +(subtotal * 0.12).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  // create order
  const order = await Order.create({ user_id: userId, total, tax, status: 'pendiente' });
  for (const it of items) {
    await OrderItem.create({ order_id: order.order_id, product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price });
    // reduce stock (best-effort)
    const p = await Product.findByPk(it.product_id);
    if (p && p.stock !== null) {
      p.stock = Math.max(0, p.stock - it.quantity);
      await p.save();
    }
  }

  // clear session cart and DB cart
  req.session.cart = [];
  try {
    const cart = await Cart.findOne({ where: { user_id: userId } });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.cart_id } });
  } catch (err) { console.warn('clear cart error', err && err.message); }

  const bodySuccess = await ejs.renderFile(path.join(__dirname, 'views', 'checkout_success.ejs'), { order, currentUser: req.session.user });
  res.render('layout', { body: bodySuccess });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Start server: sync DB (seed moved to scripts/seed.js)
async function start() {
  await sequelize.sync();
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

start();
