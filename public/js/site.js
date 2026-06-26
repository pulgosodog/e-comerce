document.addEventListener('DOMContentLoaded', () => {
  const placeholder = '/images/placeholder.png';

  const setImageFallback = (img) => {
    if (!img) return;
    const fallback = img.dataset.fallback || placeholder;
    const handleError = () => {
      if (img.src === fallback) return;
      img.src = fallback;
    };
    img.addEventListener('error', handleError);
  };

  document.querySelectorAll('img[data-fallback]').forEach(setImageFallback);

  const sortForm = document.getElementById('sort-form');
  const sortSelect = sortForm ? sortForm.querySelector('select[name="sort"]') : null;
  if (sortSelect && sortForm) {
    sortSelect.addEventListener('change', () => sortForm.submit());
  }

  const categoriesButton = document.getElementById('categories-btn');
  const dropdown = document.getElementById('categories-dropdown');
  const mobileCategoriesBtn = document.getElementById('mobile-categories-btn');
  const mobileCategoriesList = document.getElementById('mobile-categories-list');
  const mobileOverlay = document.getElementById('mobile-menu-overlay');
  const mobileClose = document.getElementById('mobile-menu-close');

  const buildCategoryLinks = (categories) => {
    return categories.map(c => `<a href="/?category=${encodeURIComponent(c.category_id)}" class="dropdown-link">${c.name}</a>`).join('');
  };

  const loadCategories = async (container) => {
    if (!container || container.dataset.loaded === 'true') return;
    try {
      const res = await fetch('/categories/list');
      const categories = await res.json();
      if (categories && categories.length) {
        container.innerHTML = buildCategoryLinks(categories);
      }
      container.dataset.loaded = 'true';
    } catch (err) {
      console.warn('Failed to load categories', err);
    }
  };

  if (categoriesButton && dropdown) {
    categoriesButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!dropdown.classList.contains('open')) {
        await loadCategories(dropdown);
        dropdown.style.display = 'flex';
        requestAnimationFrame(() => {
          dropdown.classList.add('open');
        });
      } else {
        dropdown.classList.remove('open');
        dropdown.addEventListener('transitionend', function hide() {
          dropdown.style.display = 'none';
          dropdown.removeEventListener('transitionend', hide);
        }, { once: true });
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.categories') && dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        dropdown.addEventListener('transitionend', function hide() {
          dropdown.style.display = 'none';
          dropdown.removeEventListener('transitionend', hide);
        }, { once: true });
      }
    });
  }

  const mobileToggle = document.getElementById('mobile-menu-toggle');

  if (mobileCategoriesBtn && mobileCategoriesList) {
    mobileCategoriesBtn.addEventListener('click', async () => {
      await loadCategories(mobileCategoriesList);
      const isOpen = mobileCategoriesList.classList.toggle('open');
      mobileCategoriesList.style.display = isOpen ? 'block' : 'none';
    });
  }

  if (mobileToggle && mobileOverlay) {
    mobileToggle.addEventListener('click', () => mobileOverlay.setAttribute('aria-hidden', 'false'));
  }

  if (mobileClose && mobileOverlay) {
    mobileClose.addEventListener('click', () => mobileOverlay.setAttribute('aria-hidden', 'true'));
    mobileOverlay.addEventListener('click', (event) => {
      if (event.target === mobileOverlay) mobileOverlay.setAttribute('aria-hidden', 'true');
    });
  }
});
