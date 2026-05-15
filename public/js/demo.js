const CART_KEY = 'demo-cart';
const slides = [
  {
    title: 'Ofertas imperdibles',
    subtitle: 'Encuentra productos de calidad y descuentos especiales.',
    button_text: 'Ver colecciones',
    button_link: '#products',
    image_url: 'public/images/uploads/1765363020849-2024-Apple-13-inch-iPad-Air-M2-Built-for-Apple-Intelligence-Wi-Fi-512GB-Space-Gray_4f91b61a-babb-4f24-bc15-f61d57fc645a.adc0bd5d95e8e3b0f6f38c97fddd0743.avif'
  },
  {
    title: 'Entrega rápida',
    subtitle: 'Compra hoy y recibe tus productos en menos de 48 horas.',
    button_text: 'Explorar ahora',
    button_link: '#products',
    image_url: 'public/images/uploads/1765363071116-c8a930c97af5746b7120d4b639cfe813.avif'
  },
  {
    title: 'Calidad premium',
    subtitle: 'Selección curada de productos para tu hogar y oficina.',
    button_text: 'Ver más',
    button_link: '#products',
    image_url: 'public/images/uploads/1765362651081-6145c1d32e6ac8e63a46c912dc33c5bb.avif'
  }
];

const products = [
  {
    id: 1,
    name: 'Tablet M2 13"',
    brand: 'Apple',
    description: 'Rendimiento premium para trabajo y entretenimiento.',
    price_regular: 999.99,
    price_sale: 899.99,
    is_on_sale: true,
    stock: 12,
    image_url: 'public/images/uploads/1765363020849-2024-Apple-13-inch-iPad-Air-M2-Built-for-Apple-Intelligence-Wi-Fi-512GB-Space-Gray_4f91b61a-babb-4f24-bc15-f61d57fc645a.adc0bd5d95e8e3b0f6f38c97fddd0743.avif',
    category: 'Electrónica'
  },
  {
    id: 2,
    name: 'Auriculares inalámbricos',
    brand: 'SoundPro',
    description: 'Audio envolvente y comodidad todo el día.',
    price_regular: 149.99,
    price_sale: null,
    is_on_sale: false,
    stock: 18,
    image_url: 'public/images/uploads/1765363071116-c8a930c97af5746b7120d4b639cfe813.avif',
    category: 'Electrónica'
  },
  {
    id: 3,
    name: 'Lámpara de escritorio',
    brand: 'CasaLuz',
    description: 'Diseño moderno con luz regulable para tu espacio.',
    price_regular: 69.99,
    price_sale: 54.99,
    is_on_sale: true,
    stock: 8,
    image_url: 'public/images/uploads/1765362651081-6145c1d32e6ac8e63a46c912dc33c5bb.avif',
    category: 'Hogar'
  },
  {
    id: 4,
    name: 'Mochila urbana',
    brand: 'Trend',
    description: 'Resistente, cómoda y con estilo para el día a día.',
    price_regular: 79.99,
    price_sale: null,
    is_on_sale: false,
    stock: 4,
    image_url: 'public/images/uploads/1765363071116-c8a930c97af5746b7120d4b639cfe813.avif',
    category: 'Moda'
  },
  {
    id: 5,
    name: 'Set de oficina',
    brand: 'HomePro',
    description: 'Items esenciales para mantener tu escritorio ordenado.',
    price_regular: 39.99,
    price_sale: null,
    is_on_sale: false,
    stock: 20,
    image_url: 'public/images/uploads/1765362651081-6145c1d32e6ac8e63a46c912dc33c5bb.avif',
    category: 'Hogar'
  },
  {
    id: 6,
    name: 'Chaqueta ligera',
    brand: 'Urban',
    description: 'Perfecta para salidas rápidas y clima fresco.',
    price_regular: 59.99,
    price_sale: 49.99,
    is_on_sale: true,
    stock: 11,
    image_url: 'public/images/uploads/1765363071116-c8a930c97af5746b7120d4b639cfe813.avif',
    category: 'Moda'
  }
];

const state = {
  category: '',
  sort: '',
  search: ''
};

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartItems();
  updateCartCount();
}

function updateCartCount() {
  const countSpan = document.getElementById('cart-count');
  if (!countSpan) return;
  const total = getCart().reduce((sum, item) => sum + item.quantity, 0);
  countSpan.textContent = total;
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function filteredProducts() {
  return products
    .filter(product => {
      const matchesCategory = state.category ? product.category === state.category : true;
      const query = state.search.trim().toLowerCase();
      const matchesSearch = !query || product.name.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query) || product.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (state.sort === 'price_asc') return (a.price_sale || a.price_regular) - (b.price_sale || b.price_regular);
      if (state.sort === 'price_desc') return (b.price_sale || b.price_regular) - (a.price_sale || a.price_regular);
      return 0;
    });
}

function renderSlides() {
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;
  carousel.innerHTML = slides
    .map(slide => `
      <div class="carousel-slide">
        <div class="hero-text">
          <h2>${slide.title}</h2>
          <p>${slide.subtitle}</p>
          <a class="cta" href="${slide.button_link}">${slide.button_text}</a>
        </div>
        <div class="hero-media">
          <img class="hero-image" src="${slide.image_url}" alt="${slide.title}" />
        </div>
      </div>
    `)
    .join('');
}

function renderProducts() {
  const cards = document.getElementById('product-cards');
  const title = document.getElementById('product-title');
  if (!cards || !title) return;
  const items = filteredProducts();
  cards.innerHTML = items.length
    ? items
        .map(product => {
          const priceText = product.is_on_sale && product.price_sale ? `<span class="sale">${formatPrice(product.price_sale)}</span> <span class="regular strike">${formatPrice(product.price_regular)}</span>` : `<span class="regular">${formatPrice(product.price_regular)}</span>`;
          return `
            <article class="product-card">
              <div class="product-card-media">
                <img src="${product.image_url}" alt="${product.name}" loading="lazy" />
              </div>
              <div class="product-card-content">
                <h3>${product.name}</h3>
                <p class="brand">${product.brand}</p>
                <p class="price">${priceText}</p>
                <p>${product.description}</p>
              </div>
              <div class="actions">
                <button class="btn btn-primary add-to-cart" data-id="${product.id}">Añadir al carrito</button>
                <button class="btn btn-outline">Ver detalles</button>
              </div>
            </article>
          `;
        })
        .join('')
    : '<p style="color:#666; padding:20px;">No se encontraron productos con estos filtros.</p>';
  cards.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      addToCart(id);
    });
  });
}

function renderCartItems() {
  const cartItems = document.getElementById('cart-items');
  if (!cartItems) return;
  const cart = getCart();
  if (!cart.length) {
    cartItems.innerHTML = '<p style="color:#666; padding:20px;">El carrito está vacío. Agrega un producto para empezar.</p>';
    return;
  }
  cartItems.innerHTML = cart
    .map(item => {
      const product = products.find(product => product.id === item.id);
      if (!product) return '';
      return `
        <article class="product-card">
          <div class="product-card-content">
            <h3>${product.name}</h3>
            <p class="brand">${product.brand}</p>
            <p>Cantidad: ${item.quantity}</p>
            <p class="price">Subtotal: ${formatPrice((product.price_sale || product.price_regular) * item.quantity)}</p>
          </div>
          <div class="actions">
            <button class="btn btn-outline remove-from-cart" data-id="${product.id}">Quitar</button>
          </div>
        </article>
      `;
    })
    .join('');
  cartItems.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      removeFromCart(id);
    });
  });
}

function bindUI() {
  const categoriesToggle = document.getElementById('categories-toggle');
  const categoryList = document.getElementById('category-list');
  const sortSelect = document.getElementById('sort-select');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  categoriesToggle?.addEventListener('click', () => {
    if (!categoryList) return;
    categoryList.style.display = categoryList.style.display === 'block' ? 'none' : 'block';
  });
  categoryList?.querySelectorAll('a[data-category]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      state.category = link.dataset.category;
      renderProducts();
      categoryList.style.display = 'none';
      document.getElementById('product-title').textContent = state.category ? `Categoría: ${state.category}` : 'Productos Destacados';
    });
  });
  sortSelect?.addEventListener('change', () => {
    state.sort = sortSelect.value;
    renderProducts();
  });
  searchForm?.addEventListener('submit', event => {
    event.preventDefault();
    state.search = searchInput.value || '';
    renderProducts();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  renderSlides();
  renderProducts();
  renderCartItems();
  updateCartCount();
  bindUI();
});
