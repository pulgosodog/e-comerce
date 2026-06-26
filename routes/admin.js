const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');
const { Op } = require('sequelize');
const { User, Product, HeroSlide, Order, OrderItem, Category, sequelize } = require('../models');
const { isAdmin } = require('../middleware/auth');

// Multer configuration (could be moved to a separate file later)
const multer = require('multer');
const uploadDir = path.join(__dirname, '../public', 'images', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({ storage });

// Helper to render body
const renderBody = async (view, data) => {
  return await ejs.renderFile(path.join(__dirname, '../views', view), data);
};

// Admin dashboard report
router.get('/reporte', isAdmin, async (req, res) => {
  try {
    const period = (req.query.period || 'monthly').toString().toLowerCase();
    const now = new Date();
    let startDate = new Date(now);

    if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'yearly') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const ordersInRange = await Order.findAll({
      where: {
        created_at: { [Op.gte]: startDate }
      },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: OrderItem, as: 'items', attributes: ['quantity', 'unit_price'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const revenue = ordersInRange.reduce((sum, order) => {
      const orderValue = Number(order.total || 0);
      return sum + orderValue;
    }, 0);

    const totalOrders = ordersInRange.length;
    const averageOrderValue = totalOrders > 0
      ? revenue / totalOrders
      : 0;
    const productsSold = ordersInRange.reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemsSum, item) => itemsSum + Number(item.quantity || 0), 0);
    }, 0);

    const categorySummary = await sequelize.query(`
      SELECT c.category_id, c.name AS category_name, COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.category_id
      GROUP BY c.category_id, c.name
      ORDER BY product_count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const categoryBreakdown = (categorySummary || [])
      .map(item => ({
        categoryName: item.category_name || 'Sin categoría',
        productCount: Number(item.product_count || 0)
      }))
      .filter(item => item.productCount > 0);

    const body = await renderBody('admin_report.ejs', {
      currentUser: req.session.user,
      selectedPeriod: period,
      reportData: {
        totalOrders,
        revenue,
        averageOrderValue,
        productsSold,
        categoryBreakdown,
        recentOrders: ordersInRange.slice(0, 5)
      }
    });

    res.render('layout', { body, currentUser: req.session.user });
  } catch (err) {
    console.error('admin report error', err && err.message);
    res.status(500).send('No se pudo cargar el reporte');
  }
});

// Admin: list and edit users
router.get('/users', isAdmin, async (req, res) => {
  const users = await User.findAll({ order: [['id','ASC']] });
  const body = await renderBody('admin_users.ejs', { users, currentUser: req.session.user });
  res.render('layout', { body, currentUser: req.session.user });
});

router.post('/users/:id', isAdmin, async (req, res) => {
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

// Admin: create new product
router.post('/products', isAdmin, upload.single('image'), async (req, res) => {
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

// Admin: update existing product
router.post('/products/:id', isAdmin, upload.single('image'), async (req, res) => {
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

// Admin: update order status
router.post('/orders/:id/status', isAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (Number.isNaN(id)) return res.redirect('/orders');
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

// Admin: update hero slide
router.post('/hero/:id', isAdmin, upload.single('image'), async (req, res) => {
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

module.exports = router;
