const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});

const Category = sequelize.define('Category', {
  category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false }
}, {
  tableName: 'categories',
  timestamps: false
});

const Product = sequelize.define('Product', {
  product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  price_regular: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  price_sale: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  is_on_sale: { type: DataTypes.BOOLEAN, defaultValue: false },
  sale_start_date: { type: DataTypes.DATE, allowNull: true },
  sale_end_date: { type: DataTypes.DATE, allowNull: true },
  image_url: { type: DataTypes.STRING(255), allowNull: true },
  sku: { type: DataTypes.STRING(100), unique: true },
  brand: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255) },
  email: { type: DataTypes.STRING(255), unique: true },
  password_hash: { type: DataTypes.STRING(255) },
  role: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'user' }
}, {
  tableName: 'users',
  timestamps: false
});

Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

// Cart model to persist current cart per user
const Cart = sequelize.define('Cart', {
  cart_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER }
}, {
  tableName: 'carts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const CartItem = sequelize.define('CartItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cart_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.INTEGER },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10,2) }
}, {
  tableName: 'cart_items',
  timestamps: false
});

// Orders
const Order = sequelize.define('Order', {
  order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  total: { type: DataTypes.DECIMAL(10,2) },
  tax: { type: DataTypes.DECIMAL(10,2) },
  // Use Spanish default status 'pendiente'
  status: { type: DataTypes.STRING(50), defaultValue: 'pendiente' }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.INTEGER },
  quantity: { type: DataTypes.INTEGER },
  unit_price: { type: DataTypes.DECIMAL(10,2) }
}, {
  tableName: 'order_items',
  timestamps: false
});

// Hero slides for homepage carousel
const HeroSlide = sequelize.define('HeroSlide', {
  slide_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: true },
  subtitle: { type: DataTypes.TEXT, allowNull: true },
  button_text: { type: DataTypes.STRING(100), allowNull: true },
  button_link: { type: DataTypes.STRING(255), allowNull: true },
  image_url: { type: DataTypes.STRING(255), allowNull: true },
  display_order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'hero_slides',
  timestamps: false
});

// Associations
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = { sequelize, Product, Category, User, Cart, CartItem, Order, OrderItem, HeroSlide };
