document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('admin-add-btn');
  const modal = document.getElementById('admin-modal');
  const closeBtn = document.getElementById('admin-modal-close');
  const cancelBtn = document.getElementById('admin-cancel');
  const form = document.getElementById('admin-add-form');
  const categorySelect = document.getElementById('admin-category-select');

  function open() { if (modal) { modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); } }
  function close() { if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); } }

  async function ensureCategories() {
    if (categorySelect && categorySelect.options.length <= 1) {
      try {
        const res = await fetch('/categories/list');
        const cats = await res.json();
        cats.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.category_id || c.id || c.categoryId;
          opt.textContent = c.name;
          categorySelect.appendChild(opt);
        });
      } catch (err) { console.warn('failed loading categories', err); }
    }
  }

  btn && btn.addEventListener('click', async () => {
    // reset form for new product
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.productId = '';
    open();
    await ensureCategories();
  });
  closeBtn && closeBtn.addEventListener('click', close);
  cancelBtn && cancelBtn.addEventListener('click', close);

  // close on overlay click
  modal && modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const mode = form.dataset.mode || 'create';
    const productId = form.dataset.productId;
    try {
      const url = mode === 'edit' && productId ? `/admin/products/${productId}` : '/admin/products';
      const res = await fetch(url, { method: 'POST', body: fd, headers: {} });
      const json = await res.json();
      if (!json.success) return alert(json.message || 'Error guardando producto');
      alert(mode === 'edit' ? 'Producto actualizado' : 'Producto agregado');
      close();
      // reload to show new product
      window.location.reload();
    } catch (err) {
      console.error('submit error', err);
      alert('Error al guardar producto');
    }
  });

  // Edit product pencil buttons
  document.querySelectorAll('.product-edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      if (!card) return;
      await ensureCategories();
      form.dataset.mode = 'edit';
      form.dataset.productId = card.dataset.productId;
      form.elements['name'].value = card.dataset.name || '';
      form.elements['brand'].value = card.dataset.brand || '';
      form.elements['sku'].value = card.dataset.sku || '';
      form.elements['price_regular'].value = card.dataset.price_regular || '';
      form.elements['price_sale'].value = card.dataset.price_sale || '';
      form.elements['stock'].value = card.dataset.stock || '';
      form.elements['description'].value = card.dataset.description || '';
      if (categorySelect) {
        categorySelect.value = card.dataset.category_id || '';
      }
      open();
    });
  });
});
