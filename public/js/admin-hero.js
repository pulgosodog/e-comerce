document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('admin-hero-modal');
  const closeBtn = document.getElementById('admin-hero-close');
  const cancelBtn = document.getElementById('admin-hero-cancel');
  const form = document.getElementById('admin-hero-form');

  function openModal() { modal && modal.setAttribute('aria-hidden','false'); }
  function closeModal() { modal && modal.setAttribute('aria-hidden','true'); }

  // open on pencil click
  document.querySelectorAll('.hero-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      // find the slide element
      const slide = document.querySelector(`.carousel-slide[data-id='${id}']`);
      if (!slide) return;
      const title = slide.querySelector('h2') ? slide.querySelector('h2').textContent : '';
      const subtitle = slide.querySelector('p') ? slide.querySelector('p').textContent : '';
      const a = slide.querySelector('a.cta');
      const button_text = a ? a.textContent : '';
      const button_link = a ? a.getAttribute('href') : '';

      form.elements['slide_id'].value = id;
      form.elements['title'].value = title;
      form.elements['subtitle'].value = subtitle;
      form.elements['button_text'].value = button_text;
      form.elements['button_link'].value = button_link;

      openModal();
    });
  });

  closeBtn && closeBtn.addEventListener('click', closeModal);
  cancelBtn && cancelBtn.addEventListener('click', closeModal);

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get('slide_id');
    try {
      const res = await fetch(`/admin/hero/${id}`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) return alert(json.message || 'Error guardando slide');
      // reload to show changes
      window.location.reload();
    } catch (err) {
      console.error('hero save error', err);
      alert('Error al guardar');
    }
  });
});

// carousel behaviour removed from admin script — handled by /js/carousel.js for all users
