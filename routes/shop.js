const express = require('express');
const router = express.Router();
const { Product, Category, HeroSlide, Order, OrderItem, Cart, CartItem, User } = require('../models');
const ejs = require('ejs');
const path = require('path');
const { Op } = require('sequelize');

// Helper to render body
const renderBody = async (view, data) => {
  return await ejs.renderFile(path.join(__dirname, '../views', view), data);
};

// Home: list products with optional sorting
router.get('/', async (req, res) => {
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
  const slides = await HeroSlide.findAll({ order: [['display_order','ASC']], limit: 3 });
  const body = await renderBody('index.ejs', { products, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Deals: list products on sale
router.get('/deals', async (req, res) => {
  const sort = req.query.sort || '';
  let order = [];
  if (sort === 'price_asc') order = [['price_regular', 'ASC']];
  if (sort === 'price_desc') order = [['price_regular', 'DESC']];

  const products = await Product.findAll({ where: { is_on_sale: true }, include: ['category'], order });
  const filtered = products.filter(p => p.price_sale !== null && p.price_sale !== undefined);
  const categories = await Category.findAll();
  const selectedCategory = { name: 'Ofertas', category_id: '' };
  const slides = await HeroSlide.findAll({ order: [['display_order','ASC']], limit: 3 });
  const body = await renderBody('index.ejs', { products: filtered, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Search by brand or product name
router.get('/search', async (req, res) => {
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
  const body = await renderBody('index.ejs', { products, categories, sort, selectedCategory, slides, currentUser: req.session.user });
  res.render('layout', { body });
});

// Categories list (JSON) for dropdown
router.get('/categories/list', async (req, res) => {
  const categories = await Category.findAll();
  res.json(categories);
});

// Product detail page
router.get('/product/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).send('Invalid product id');
  const product = await Product.findByPk(id, { include: ['category'] });
  if (!product) return res.status(404).send('Product not found');
  const body = await renderBody('product.ejs', { product, currentUser: req.session.user });
  res.render('layout', { body });
});

// Cart page
router.get('/cart', async (req, res) => {
  const sessionCart = req.session.cart || [];
  const items = [];
  for (const it of sessionCart) {
    const prod = await Product.findByPk(it.productId);
    if (!prod) continue;
    items.push({ product: prod, quantity: it.quantity, unit_price: parseFloat(prod.price_regular) });
  }
  const subtotal = items.reduce((s, it) => s + (parseFloat(it.unit_price) * it.quantity), 0);
  const tax = +(subtotal * 0.12).toFixed(2); // example 12% IVA
  const totals = { subtotal, tax, total: +(subtotal + tax).toFixed(2) };

  const excludedIds = items.length ? items.map(i => i.product.product_id) : [];
  const cartCategoryIds = [...new Set(items.map(i => i.product.category_id).filter(id => id != null))];

  let suggestedProducts = [];
  if (cartCategoryIds.length) {
    suggestedProducts = await Product.findAll({
      where: {
        category_id: cartCategoryIds,
        product_id: { [Op.notIn]: excludedIds }
      },
      limit: 4,
      order: [['product_id', 'DESC']]
    });
  }

  if (suggestedProducts.length < 4) {
    const remainingCount = 4 - suggestedProducts.length;
    const excludedFallback = excludedIds.concat(suggestedProducts.map(p => p.product_id));
    const fallbackProducts = await Product.findAll({
      where: {
        product_id: { [Op.notIn]: excludedFallback }
      },
      limit: remainingCount,
      order: [['stock', 'DESC']]
    });
    suggestedProducts = suggestedProducts.concat(fallbackProducts);
  }

  const body = await renderBody('cart.ejs', { items, totals, suggestedProducts, currentUser: req.session.user });
  res.render('layout', { body });
});

// Cart add
router.post('/cart/add', async (req, res) => {
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
      const dbItems = await CartItem.findAll({ where: { cart_id: cart.cart_id } });
      req.session.cart = dbItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
    } catch (err) {
      console.warn('Failed to persist cart add:', err && err.message);
    }
  }

  res.json({ success: true, cart: req.session.cart });
});

// Cart update
router.post('/cart/update', async (req, res) => {
  const { productId, quantity } = req.body;
  const q = parseInt(quantity, 10) || 1;
  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(c => c.productId == productId);
  if (existing) existing.quantity = q;
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

// Cart remove
router.post('/cart/remove', async (req, res) => {
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

// Cart checkout
router.post('/cart/checkout', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  const sessionCart = req.session.cart || [];
  if (!sessionCart.length) return res.redirect('/cart');
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

  const order = await Order.create({ user_id: userId, total, tax, status: 'pendiente' });
  for (const it of items) {
    await OrderItem.create({ order_id: order.order_id, product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price });
    const p = await Product.findByPk(it.product_id);
    if (p && p.stock !== null) {
      p.stock = Math.max(0, p.stock - it.quantity);
      await p.save();
    }
  }

  req.session.cart = [];
  try {
    const cart = await Cart.findOne({ where: { user_id: userId } });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.cart_id } });
  } catch (err) { console.warn('clear cart error', err && err.message); }

  const bodySuccess = await renderBody('checkout_success.ejs', { order, currentUser: req.session.user });
  res.render('layout', { body: bodySuccess });
});

// Orders route: show current user orders, admin sees order panel
router.get('/orders', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  if (req.session.user.role === 'admin') {
    const orders = await Order.findAll({ order: [['created_at','DESC']], include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: User, as: 'user' }
    ] });
    const body = await renderBody('admin_orders.ejs', { orders, currentUser: req.session.user });
    return res.render('layout', { body });
  }

  const userId = req.session.user.id;
  const orders = await Order.findAll({
    where: { user_id: userId },
    order: [['created_at','DESC']],
    include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
  });
  const body = await renderBody('orders.ejs', { orders, currentUser: req.session.user });
  res.render('layout', { body });
});

module.exports = router;
