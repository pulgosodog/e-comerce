# E-commerce Express + EJS

Proyecto demo de e-commerce con Node.js, Express, EJS y SQLite/Sequelize. Incluye autenticación con sesiones, carrito persistente, órdenes, panel admin para productos/hero/usuarios, y búsqueda.

## Requisitos
- Node.js >= 18
- npm (incluido con Node)

## Clonar desde GitHub
```bash
git clone https://github.com/pulgosodog/e-comerce)
cd e-commerce
```

## Instalación
```bash
npm install
```

## Base de datos y seed
El proyecto usa SQLite (archivo `database.sqlite` en la raíz).

## Ejecutar en desarrollo
```bash
npm run dev   # nodemon
# o
npm start     # node server.js
```
La app arranca en http://localhost:3000 (puedes cambiar el puerto con `PORT`).

## Crear/Promover usuario admin
Ejemplo rápido (cambia email/clave):
-Crea tu usuario.
-Por seguridad, manualmente cambia el role a "admin". (El uso de DB Browser for Sqlite es recomendado)

## Funcionalidades clave
- Catálogo con categorías, ofertas (`/deals`), búsqueda por nombre/marca (`/search`).
- Carrito con sesión y persistencia en DB; merge desde localStorage al iniciar sesión.
- Checkout con creación de órdenes e items, decremento de stock.
- Panel admin: crear/editar productos (subida de imágenes), editar hero (slides), ver/actualizar órdenes, gestionar usuarios.
- Hero carrusel editable (texto, botón, enlace, imagen) por slide.
- Footer con créditos.

## Rutas principales
- `GET /` catálogo
- `GET /deals` ofertas (is_on_sale)
- `GET /search?q=` búsqueda por nombre/marca
- Auth: `/login`, `/register`, `/auth/login`, `/auth/register`, `/auth/logout`
- Carrito: `/cart`, `/cart/add`, `/cart/update`, `/cart/remove`, `/cart/checkout`
- Órdenes usuario: `/orders`
- Admin: `/admin/products` (POST crear), `/admin/products/:id` (POST editar), `/admin/hero/:id` (POST editar slide), `/admin/users` (listar/editar usuarios), `/orders` (como admin muestra panel de órdenes), `/orders/:id/status` (POST cambiar estado)

## Archivos importantes
- `server.js` — servidor Express, rutas, sesiones.
- `models/index.js` — modelos Sequelize (Product, Category, User, Cart/CartItem, Order/OrderItem, HeroSlide).
- `views/` — plantillas EJS (layout, header, hero, cards, auth, admin vistas).
- `public/` — CSS, JS, imágenes (subidas en `public/images/uploads`).

## Scripts útiles
- `npm run dev` — nodemon

## Despliegue rápido
1. `npm install`
4. `npm start`

## Licencia
Uso educativo/demostrativo.
