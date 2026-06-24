document.addEventListener('DOMContentLoaded', () => {
  const cardView = document.getElementById('admin-card-view');
  const tableView = document.getElementById('admin-table-view');
  const cardsBtn = document.getElementById('view-cards-btn');
  const tableBtn = document.getElementById('view-table-btn');
  const modeKey = 'adminProductViewMode';

  if (!cardView || !tableView || !cardsBtn || !tableBtn) return;

  const createCell = (content) => {
    const td = document.createElement('td');
    td.textContent = content;
    return td;
  };

  const createRow = (product) => {
    const tr = document.createElement('tr');
    tr.appendChild(createCell(product.productId));
    tr.appendChild(createCell(product.name));
    tr.appendChild(createCell(product.brand || '-'));
    tr.appendChild(createCell(product.sku || '-'));
    tr.appendChild(createCell(product.categoryName || '-'));
    tr.appendChild(createCell(product.stock));
    tr.appendChild(createCell(product.priceRegular));
    tr.appendChild(createCell(product.priceSale || '-'));
    tr.appendChild(createCell(product.isOnSale ? 'Sí' : 'No'));
    const actionTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'table-action-btn table-edit-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = 'Editar producto';
    editBtn.addEventListener('click', () => {
      if (window.openAdminEditProduct) {
        window.openAdminEditProduct(product);
      }
    });
    actionTd.appendChild(editBtn);
    tr.appendChild(actionTd);
    return tr;
  };

  const buildTable = (products) => {
    tableView.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'product-table-wrapper';
    const table = document.createElement('table');
    table.className = 'product-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['ID', 'Nombre', 'Marca', 'SKU', 'Categoría', 'Stock', 'Precio', 'Oferta', 'En oferta', 'Editar'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    products.forEach((product) => tbody.appendChild(createRow(product)));
    table.appendChild(tbody);
    wrapper.appendChild(table);
    tableView.appendChild(wrapper);
  };

  const getProductsFromCards = () => {
    return Array.from(cardView.querySelectorAll('.product-card')).map((card) => ({
      productId: card.dataset.productId,
      name: card.dataset.name,
      brand: card.dataset.brand,
      sku: card.dataset.sku,
      categoryName: card.dataset.categoryName,
      stock: card.dataset.stock,
      priceRegular: card.dataset.price_regular,
      priceSale: card.dataset.price_sale,
      isOnSale: card.dataset.isOnSale === '1'
    }));
  };

  const setView = (mode, save = true) => {
    const showTable = mode === 'table';
    cardView.style.display = showTable ? 'none' : '';
    tableView.style.display = showTable ? '' : 'none';
    cardsBtn.classList.toggle('active', !showTable);
    tableBtn.classList.toggle('active', showTable);
    if (showTable && !tableView.children.length) {
      buildTable(getProductsFromCards());
    }
    if (save) localStorage.setItem(modeKey, mode);
  };

  setView(localStorage.getItem(modeKey) || 'cards', false);

  cardsBtn.addEventListener('click', () => setView('cards'));
  tableBtn.addEventListener('click', () => setView('table'));
});
