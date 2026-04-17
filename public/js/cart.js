function getLocalCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveLocalCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countSpan = document.getElementById('cart-count');
  if (!countSpan) return;
  const local = getLocalCart();
  const localTotal = local.reduce((s, it) => s + (it.quantity || 0), 0);
  const serverCountAttr = parseInt(countSpan.dataset.serverCount || '0', 10) || 0;
  // Show combined total: server + local. This avoids waiting for a server roundtrip
  // If server already contains same items, this may double-count until merge, but
  // it ensures the user sees their local items immediately.
  const total = serverCountAttr + localTotal;
  countSpan.textContent = total;
}

function addToLocalCart(productId, quantity = 1) {
  const cart = getLocalCart();
  const found = cart.find(c => c.productId === productId);
  if (found) found.quantity += quantity;
  else cart.push({ productId, quantity });
  saveLocalCart(cart);
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pid = parseInt(btn.dataset.productId, 10);
      const originalText = btn.innerHTML;
      const originalBg = btn.style.backgroundColor || '#0f8c6'; // Color original asumido
      const originalWidth = btn.offsetWidth;
      btn.disabled = true;
      btn.style.backgroundColor = '#A5D6A7'; // Verde menos saturado y más blanquecino
      btn.style.transition = 'background-color 0.3s';
      btn.innerHTML = '<span>...</span>';
      btn.style.width = originalWidth + 'px';
      let dotCount = 0;
      const loadingInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        btn.querySelector('span').textContent = '.'.repeat(dotCount);
      }, 300);
      // Intentar agregar al servidor primero
      try {
        const res = await fetch('/cart/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: pid, quantity: 1 }) });
        if (res.ok) {
          const json = await res.json();
          // Actualizar conteo visible basado en el carrito del servidor
          const span = document.getElementById('cart-count');
          if (span) {
            span.dataset.serverCount = String(json.cart.reduce((s, it) => s + it.quantity, 0));
            updateCartCount();
          }
          // Mostrar check y fade back
          clearInterval(loadingInterval);
          btn.innerHTML = '✓';
          btn.style.width = originalWidth + 'px';
          btn.style.backgroundColor = '#4CAF50';
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.width = '';
            btn.style.backgroundColor = '';
            btn.disabled = false;
          }, 1000);
          return;
        }
      } catch (err) {
        // Ignorar
      }
      // Fallback a localStorage
      addToLocalCart(pid, 1);
      // Mostrar check y fade back
      clearInterval(loadingInterval);
      btn.innerHTML = '✓';
      btn.style.width = originalWidth + 'px';
      btn.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.width = '';
        btn.style.backgroundColor = '';
        btn.disabled = false;
      }, 1000);
    });
  });
});
