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
      // if user not logged (no server-side session exposed), use localStorage
      // Attempt to add to server first (best-effort), fall back to local
      try {
        const res = await fetch('/cart/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: pid, quantity: 1 }) });
        if (res.ok) {
          const json = await res.json();
          // update visible count based on server cart
          const span = document.getElementById('cart-count');
          if (span) {
            span.dataset.serverCount = String(json.cart.reduce((s, it) => s + it.quantity, 0));
            // reflect server count + local
            updateCartCount();
          }
          return;
        }
      } catch (err) {
        // ignore
      }
      addToLocalCart(pid, 1);
      // updateCartCount will be called from saveLocalCart via saveLocalCart->updateCartCount
      alert('Producto agregado al carrito');
    });
  });
});
