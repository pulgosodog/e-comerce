const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');
const { User, Cart, CartItem, Product } = require('../models');

// Helper to render body (since server.js uses ejs.renderFile)
// In a real refactor, we might want to move this to a controller or a helper.
// For now, I'll keep it similar to server.js.
const renderBody = async (view, data) => {
  return await ejs.renderFile(path.join(__dirname, '../views', view), data);
};

router.get('/login', async (req, res) => {
  const body = await renderBody('login.ejs', { currentUser: req.session.user });
  res.render('layout', { body });
});

router.post('/auth/login', async (req, res) => {
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

router.get('/register', async (req, res) => {
  const body = await renderBody('register.ejs', { currentUser: req.session.user });
  res.render('layout', { body });
});

router.post('/auth/register', async (req, res) => {
  const { name, email, password, address, phone, lat, lng } = req.body;
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    const bodyHtml = await renderBody('register.ejs', { error: 'Email already registered', currentUser: req.session.user });
    return res.status(400).render('layout', { body: bodyHtml });
  }
  const hash = await bcrypt.hash(password, 10);
  const latVal = (typeof lat !== 'undefined' && lat !== '') ? parseFloat(lat) : null;
  const lngVal = (typeof lng !== 'undefined' && lng !== '') ? parseFloat(lng) : null;
  const user = await User.create({ name, email, password_hash: hash, role: 'user', address: address || null, phone: phone || null, lat: latVal, lng: lngVal });
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'user', address: user.address, phone: user.phone, lat: user.lat, lng: user.lng };
  if (!req.session.cart) req.session.cart = [];
  res.redirect('/');
});

router.post('/auth/merge-cart', (req, res) => {
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

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
