# Referencia Rápida - E-Commerce Database

## Cheat Sheet de Consultas Comunes

### 🛒 Carrito

#### Obtener carrito del usuario actual
```javascript
const cart = await Cart.findOne({
  where: { user_id: userId },
  include: [{ model: CartItem, as: 'items', include: ['product'] }]
});
```

#### Agregar/actualizar item al carrito
```javascript
const [cartItem, created] = await CartItem.findOrCreate({
  where: { cart_id: cartId, product_id: productId },
  defaults: { quantity: qty, unit_price: product.price_regular }
});

if (!created) {
  cartItem.quantity += qty;
  await cartItem.save();
}
```

#### Limpiar carrito
```javascript
await CartItem.destroy({ where: { cart_id: cartId } });
```

---

### 📦 Productos

#### Listar todos los productos
```javascript
const products = await Product.findAll({
  include: ['category'],
  order: [['created_at', 'DESC']]
});
```

#### Filtrar por categoría
```javascript
const products = await Product.findAll({
  where: { category_id: catId },
  include: ['category']
});
```

#### Productos en oferta
```javascript
const onSale = await Product.findAll({
  where: { is_on_sale: true },
  attributes: ['product_id', 'name', 'price_regular', 'price_sale']
});
```

#### Buscar por nombre o marca (LIKE)
```javascript
const { Op } = require('sequelize');

const results = await Product.findAll({
  where: {
    [Op.or]: [
      { name: { [Op.like]: `%${query}%` } },
      { brand: { [Op.like]: `%${query}%` } }
    ]
  }
});
```

#### Productos con bajo stock (< 5)
```javascript
const lowStock = await Product.findAll({
  where: { stock: { [Op.lt]: 5 } },
  order: [['stock', 'ASC']]
});
```

#### Actualizar stock (al crear orden)
```javascript
await Product.decrement('stock', {
  by: qty,
  where: { product_id: productId }
});
```

---

### 👥 Usuarios & Autenticación

#### Buscar usuario por email
```javascript
const user = await User.findOne({ where: { email } });
```

#### Crear usuario
```javascript
const user = await User.create({
  name,
  email,
  password_hash: await bcrypt.hash(password, 10),
  role: 'user'
});
```

#### Promover usuario a admin
```javascript
user.role = 'admin';
await user.save();
```

#### Obtener todos los usuarios (admin)
```javascript
const users = await User.findAll({
  attributes: { exclude: ['password_hash'] },
  order: [['id', 'ASC']]
});
```

---

### 📋 Órdenes

#### Crear orden (checkout)
```javascript
const order = await Order.create({
  user_id: userId,
  total,
  tax,
  status: 'pendiente'
});

// Agregar items
for (const item of cartItems) {
  await OrderItem.create({
    order_id: order.order_id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unit_price
  });
}
```

#### Obtener órdenes del usuario
```javascript
const orders = await Order.findAll({
  where: { user_id: userId },
  include: [{ model: OrderItem, as: 'items', include: ['product'] }],
  order: [['created_at', 'DESC']]
});
```

#### Obtener orden específica
```javascript
const order = await Order.findByPk(orderId, {
  include: [
    { model: OrderItem, as: 'items', include: ['product'] },
    { model: User, as: 'user' }
  ]
});
```

#### Actualizar estado de orden
```javascript
order.status = 'enviado'; // o 'entregado', 'cancelado', etc.
await order.save();
```

#### Listar todas las órdenes (admin)
```javascript
const allOrders = await Order.findAll({
  include: [
    { model: OrderItem, as: 'items', include: ['product'] },
    { model: User, as: 'user' }
  ],
  order: [['created_at', 'DESC']]
});
```

---

### 📊 Análisis y Reportes

#### Productos más vendidos (últimos 30 días)
```javascript
const { Op } = require('sequelize');
const { sequelize } = require('./models');

const topSelling = await OrderItem.findAll({
  where: {
    created_at: {
      [Op.gte]: new Date(Date.now() - 30*24*60*60*1000)
    }
  },
  attributes: [
    'product_id',
    [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty'],
    [sequelize.fn('SUM', sequelize.col('unit_price')), 'totalRevenue']
  ],
  group: ['product_id'],
  order: [[sequelize.literal('totalQty'), 'DESC']],
  limit: 10,
  include: [{ model: Product, as: 'product', attributes: ['name', 'brand'] }],
  subQuery: false
});
```

#### Ingresos por período
```javascript
const { Op } = require('sequelize');
const { sequelize } = require('./models');

const startDate = new Date('2026-01-01');
const endDate = new Date('2026-12-31');

const revenue = await Order.findAll({
  where: {
    created_at: { [Op.between]: [startDate, endDate] },
    status: { [Op.in]: ['enviado', 'entregado'] }
  },
  attributes: [
    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
    [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
    [sequelize.fn('COUNT', sequelize.col('order_id')), 'orderCount']
  ],
  group: [sequelize.fn('DATE', sequelize.col('created_at'))],
  order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
  raw: true
});
```

#### Promedio de orden
```javascript
const { sequelize } = require('./models');

const avgOrder = await Order.findOne({
  where: { status: { [Op.in]: ['enviado', 'entregado'] } },
  attributes: [
    [sequelize.fn('AVG', sequelize.col('total')), 'avgTotal'],
    [sequelize.fn('COUNT', sequelize.col('order_id')), 'totalOrders']
  ],
  raw: true
});
```

#### Clientes más activos (últimos 90 días)
```javascript
const { Op } = require('sequelize');
const { sequelize } = require('./models');

const activeCustomers = await Order.findAll({
  where: {
    created_at: {
      [Op.gte]: new Date(Date.now() - 90*24*60*60*1000)
    }
  },
  attributes: [
    'user_id',
    [sequelize.fn('COUNT', sequelize.col('order_id')), 'orderCount'],
    [sequelize.fn('SUM', sequelize.col('total')), 'totalSpent']
  ],
  group: ['user_id'],
  order: [[sequelize.literal('totalSpent'), 'DESC']],
  limit: 10,
  include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
  raw: false,
  subQuery: false
});
```

#### Producto más vendido por categoría
```javascript
const topByCategory = await Product.findAll({
  attributes: ['category_id'],
  include: [
    {
      model: OrderItem,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']
      ],
      where: { created_at: { [Op.gte]: '2026-01-01' } },
      separate: true
    }
  ],
  raw: true
});
```

---

### 🎨 Hero Slides

#### Obtener slides ordenados
```javascript
const slides = await HeroSlide.findAll({
  order: [['display_order', 'ASC']],
  limit: 3
});
```

#### Actualizar slide
```javascript
const slide = await HeroSlide.findByPk(slideId);
slide.title = newTitle;
slide.subtitle = newSubtitle;
slide.button_link = newLink;
// ... otros campos
await slide.save();
```

---

## Constantes y Enums

### Estados de Orden
```javascript
const ORDER_STATUS = {
  PENDIENTE: 'pendiente',
  PROCESANDO: 'procesando',
  ENVIADO: 'enviado',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado'
};
```

### Roles de Usuario
```javascript
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};
```

---

## Tips de Performance

### 1. Usar `attributes` para limitar columnas
```javascript
// ❌ Trae toda la columna password_hash (lento)
const users = await User.findAll();

// ✅ Excluye password_hash
const users = await User.findAll({
  attributes: { exclude: ['password_hash'] }
});
```

### 2. Usar `limit` y `offset` para paginación
```javascript
const page = 1;
const pageSize = 20;

const products = await Product.findAll({
  limit: pageSize,
  offset: (page - 1) * pageSize,
  order: [['created_at', 'DESC']]
});
```

### 3. Usar índices en campos buscados
```javascript
// Crear índices en:
// - category_id, sku, created_at (Products)
// - user_id (Orders, Carts)
// - product_id (OrderItems, CartItems)
```

### 4. Eager loading vs Lazy loading
```javascript
// ❌ Lazy: N+1 queries
const orders = await Order.findAll();
for (const order of orders) {
  const items = await order.getItems(); // Query por cada orden
}

// ✅ Eager: 1 query
const orders = await Order.findAll({
  include: [{ model: OrderItem, as: 'items' }]
});
```

---

## Relaciones Sequelize

```javascript
// 1:1 (User ↔ Cart)
User.hasOne(Cart, { foreignKey: 'user_id' });
Cart.belongsTo(User, { foreignKey: 'user_id' });

// 1:N (Cart ↔ CartItem)
Cart.hasMany(CartItem, { foreignKey: 'cart_id' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });

// N:M (Product ↔ OrderItem) a través de Orders
Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
```

---

## Validaciones Recomendadas

### En el Modelo (Sequelize)
```javascript
const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [3, 255]
    }
  },
  price_regular: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  }
});
```

### En Express (Middleware)
```javascript
const { body, validationResult } = require('express-validator');

router.post('/products', [
  body('name').trim().len(3, 255),
  body('price_regular').isDecimal().custom(v => v > 0),
  body('stock').isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Crear producto...
});
```

---

## Notas Finales

- **Sincronización de sesión**: El carrito se sincroniza entre `req.session.cart` y `carts`/`cart_items` al login
- **Transacciones**: Para checkout, envolver creación de Order + OrderItems en transacción
- **Auditoría**: Considerar agregar tabla de `audit_logs` para acciones admin
- **Borrado lógico**: Considerar usar soft deletes (`deletedAt`) en lugar de DELETE directo
- **Caché**: Cachear categorías y hero_slides (rara vez cambian)

---

**Versión**: 1.0  
**Última actualización**: 2026-06-26
