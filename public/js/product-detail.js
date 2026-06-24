document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('add-to-cart-detail');
  if (!button) return;

  button.addEventListener('click', async () => {
    const productId = Number(button.dataset.productId);
    const qtyInput = document.getElementById('qty');
    const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

    try {
      const res = await fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty })
      });
      if (res.ok) {
        const json = await res.json();
        const span = document.getElementById('cart-count');
        if (span) {
          span.textContent = json.cart.reduce((sum, it) => sum + it.quantity, 0);
        }
        alert('Producto agregado al carrito');
        return;
      }
      const json = await res.json();
      alert(json.message || 'Error al agregar al carrito');
    } catch (err) {
      const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = localCart.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity += qty;
      } else {
        localCart.push({ productId, quantity: qty });
      }
      localStorage.setItem('cart', JSON.stringify(localCart));
      const span = document.getElementById('cart-count');
      if (span) {
        span.textContent = localCart.reduce((sum, it) => sum + it.quantity, 0);
      }
      alert('Producto agregado al carrito (local)');
    }
  });
});
