# Arquitectura de la Base de Datos - E-Commerce

## Descripción General

El proyecto utiliza **SQLite** (local) o PostgreSQL (producción) con **Sequelize** como ORM. La base de datos está diseñada para soportar un e-commerce con catálogo de productos, gestión de usuarios, carritos de compra y órdenes.

**Ubicación**: `database.sqlite` (desarrollo)  
**Tipo**: SQLite (desarrollo) / PostgreSQL (producción)  
**ORM**: Sequelize 6.32.0

---

## Tablas y Campos

### 1. **categories** (Categorías de Productos)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `category_id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NOT NULL | Nombre de la categoría |

**Propósito**: Organizar productos por categorías (ej: Electrónica, Accesorios)  
**Relaciones**: `1:N` con `products`

---

### 2. **products** (Catálogo de Productos)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `product_id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NOT NULL | Nombre del producto |
| `description` | TEXT | NULL | Descripción detallada |
| `price_regular` | DECIMAL(10,2) | NOT NULL | Precio normal |
| `price_sale` | DECIMAL(10,2) | NULL | Precio en oferta (si aplica) |
| `stock` | INTEGER | DEFAULT: 0 | Cantidad disponible |
| `category_id` | INTEGER | FK, NULL | Referencia a `categories` |
| `is_on_sale` | BOOLEAN | DEFAULT: false | Indica si está en oferta |
| `sale_start_date` | DATE | NULL | Fecha inicio oferta |
| `sale_end_date` | DATE | NULL | Fecha fin oferta |
| `image_url` | VARCHAR(255) | NULL | URL/ruta de la imagen |
| `sku` | VARCHAR(100) | UNIQUE | Código de referencia |
| `brand` | VARCHAR(100) | NULL | Marca del producto |
| `created_at` | DATETIME | AUTO | Fecha de creación |
| `updated_at` | DATETIME | AUTO | Fecha de última actualización |

**Propósito**: Almacenar información de productos disponibles  
**Relaciones**: 
- `N:1` con `categories` (FK: `category_id`)
- `1:N` con `cart_items`
- `1:N` con `order_items`

**Índices recomendados**:
- `category_id` (para filtrar por categoría)
- `sku` (búsqueda rápida)
- `created_at` (ordenamiento y reportes)

---

### 3. **users** (Usuarios del Sistema)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NULL | Nombre completo |
| `email` | VARCHAR(255) | UNIQUE | Email (usuario único) |
| `password_hash` | VARCHAR(255) | NULL | Hash bcrypt de contraseña |
| `role` | VARCHAR(50) | DEFAULT: 'user' | Rol: 'user' o 'admin' |
| `address` | VARCHAR(500) | NULL | Dirección de envío |
| `phone` | VARCHAR(50) | NULL | Teléfono de contacto |
| `lat` | DECIMAL(10,8) | NULL | Latitud (coordenadas) |
| `lng` | DECIMAL(11,8) | NULL | Longitud (coordenadas) |

**Propósito**: Autenticación y datos de usuario  
**Relaciones**:
- `1:1` con `carts` (FK: `user_id`)
- `1:N` con `orders` (FK: `user_id`)

**Roles**:
- `user` - Usuario estándar (puede comprar)
- `admin` - Administrador (acceso a panel de control)

---

### 4. **carts** (Carritos de Compra)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `cart_id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `user_id` | INTEGER | FK | Referencia a `users` |
| `created_at` | DATETIME | AUTO | Fecha de creación |
| `updated_at` | DATETIME | AUTO | Fecha de última actualización |

**Propósito**: Persistir carrito por usuario (complementa `req.session.cart`)  
**Relaciones**:
- `N:1` con `users` (FK: `user_id`)
- `1:N` con `cart_items`

---

### 5. **cart_items** (Items del Carrito)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `cart_id` | INTEGER | FK | Referencia a `carts` |
| `product_id` | INTEGER | FK | Referencia a `products` |
| `quantity` | INTEGER | DEFAULT: 1 | Cantidad de unidades |
| `unit_price` | DECIMAL(10,2) | NULL | Precio unitario al momento |

**Propósito**: Almacenar items individuales del carrito  
**Relaciones**:
- `N:1` con `carts` (FK: `cart_id`)
- `N:1` con `products` (FK: `product_id`)

---

### 6. **orders** (Órdenes de Compra)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `order_id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `user_id` | INTEGER | FK | Referencia a `users` |
| `total` | DECIMAL(10,2) | NULL | Total con impuestos |
| `tax` | DECIMAL(10,2) | NULL | Monto de impuesto (IVA) |
| `status` | VARCHAR(50) | DEFAULT: 'pendiente' | Estado de la orden |
| `created_at` | DATETIME | AUTO | Fecha de creación |
| `updated_at` | DATETIME | AUTO | Fecha de última actualización |

**Propósito**: Registrar órdenes confirmadas  
**Relaciones**:
- `N:1` con `users` (FK: `user_id`)
- `1:N` con `order_items`

**Estados posibles**:
- `pendiente` - Orden recibida, en procesamiento
- `procesando` - En preparación
- `enviado` - Enviada al cliente
- `entregado` - Completada
- `cancelado` - Cancelada

---

### 7. **order_items** (Items de Órdenes)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `order_id` | INTEGER | FK | Referencia a `orders` |
| `product_id` | INTEGER | FK | Referencia a `products` |
| `quantity` | INTEGER | NULL | Cantidad vendida |
| `unit_price` | DECIMAL(10,2) | NULL | Precio unitario en el momento de venta |
| `created_at` | DATETIME | AUTO | Fecha de creación del item |

**Propósito**: Detalles de cada producto en una orden  
**Relaciones**:
- `N:1` con `orders` (FK: `order_id`)
- `N:1` con `products` (FK: `product_id`)

**Nota importante**: El campo `created_at` permite análisis de ventas por período (productos más vendidos por rango de fechas).

---

### 8. **hero_slides** (Slides del Carrusel Principal)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `slide_id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `title` | VARCHAR(255) | NULL | Título del slide |
| `subtitle` | TEXT | NULL | Subtítulo o descripción |
| `button_text` | VARCHAR(100) | NULL | Texto del botón CTA |
| `button_link` | VARCHAR(255) | NULL | URL destino del botón |
| `image_url` | VARCHAR(255) | NULL | URL/ruta de la imagen |
| `display_order` | INTEGER | DEFAULT: 0 | Orden de visualización |

**Propósito**: Contenido editable del carrusel hero en homepage  
**Relaciones**: Ninguna (tabla independiente)

---

## Flujo de Datos Principales

### Flujo de Compra

```
1. Usuario agrega producto al carrito (session + cart_items)
   Product → CartItem ← Cart ← User

2. Usuario confirma compra
   CartItem items → nueva Order
   Order ← User

3. Para cada CartItem se crea OrderItem
   CartItem (producto, cantidad, precio) → OrderItem

4. Stock se decrementa en Product

5. Carrito se vacía (session + cart_items)
```

### Consultas Típicas

#### Carrito del usuario
```javascript
// Obtener items del carrito actual
Cart.findOne({
  where: { user_id: userId },
  include: [{ model: CartItem, as: 'items', include: ['product'] }]
})
```

#### Órdenes del usuario
```javascript
// Obtener todas las órdenes de un usuario
Order.findAll({
  where: { user_id: userId },
  include: [{ model: OrderItem, as: 'items', include: ['product'] }],
  order: [['created_at', 'DESC']]
})
```

#### Productos más vendidos (por período)
```javascript
// Ejemplo: productos más vendidos en últimos 30 días
OrderItem.findAll({
  where: {
    created_at: { [Op.gte]: new Date(Date.now() - 30*24*60*60*1000) }
  },
  attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
  group: ['product_id'],
  order: [[sequelize.literal('totalQty'), 'DESC']],
  limit: 10,
  include: ['product']
})
```

#### Productos por categoría (con sugerencias)
```javascript
// Para el carrito: sugerencias de misma categoría
Product.findAll({
  where: {
    category_id: categoryId,
    product_id: { [Op.notIn]: excludedIds }
  },
  limit: 4
})
```

---

## Índices Recomendados

Para optimizar performance en producción:

```sql
-- Búsquedas por usuario
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Búsquedas de productos
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Análisis de ventas
CREATE INDEX idx_order_items_created_at ON order_items(created_at);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- FK genéricas
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

---

## Diagrama de Relaciones

Ver archivo [database-uml.puml](database-uml.puml) para el diagrama ER completo en formato PlantUML.

---

## Notas Importantes

1. **Gestión de Sesión**: El carrito se maneja en dos niveles:
   - `req.session.cart` (localStorage/sesión) para usuarios no autenticados
   - `carts` + `cart_items` para usuarios autenticados

2. **Precios en OrderItem**: Se guardan `unit_price` para mantener registro histórico del precio al momento de venta

3. **Timestamps**:
   - `products`, `orders`, `carts`: tienen `createdAt` y `updatedAt`
   - `order_items`: tiene `createdAt` para análisis de ventas por fecha
   - `users`, `categories`, `hero_slides`: sin timestamps (datos más estáticos)

4. **Sincronización de Stock**:
   - Decrementar en `products.stock` al confirmar orden
   - No hay tabla de historial de stock (considerar agregar si es necesario)

5. **Roles de Usuario**:
   - Sistema simple con dos roles: `user` y `admin`
   - Extendible para otros roles como `moderator` o `supplier`

---

## Consideraciones Futuras

- [ ] Tabla de `categories_hierarchy` si se necesitan subcategorías
- [ ] Tabla de `discounts` para cupones y descuentos aplicables
- [ ] Tabla de `reviews` para calificaciones de productos
- [ ] Tabla de `stock_history` para auditoría de cambios
- [ ] Tabla de `user_addresses` para múltiples direcciones por usuario
- [ ] Tabla de `shipping_methods` para opciones de envío
- [ ] Tabla de `payments` para registro de transacciones
- [ ] Tabla de `returns` para devoluciones y reembolsos

---

## Versión del Documento

- **Última actualización**: 2026-06-26
- **ORM**: Sequelize 6.32.0
- **Bases de datos soportadas**: SQLite (dev), PostgreSQL (prod)
