const { sequelize, Product, Category, User } = require('./models');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    const catCount = await Category.count();
    const prodCount = await Product.count();
    const userCount = await User.count();
    console.log(`Counts -> categories: ${catCount}, products: ${prodCount}, users: ${userCount}`);

    const cats = await Category.findAll({ limit: 200, order: [['category_id','ASC']] });
    console.log('Categories (up to 200):');
    cats.forEach(c => console.log(`  id=${c.category_id} name=${c.name}`));

    const prods = await Product.findAll({ limit: 200, order: [['product_id','ASC']] });
    console.log('Products (up to 200):');
    prods.forEach(p => console.log(`  id=${p.product_id} sku=${p.sku} name=${p.name} category_id=${p.category_id}`));

    process.exit(0);
  } catch (err) {
    console.error('DB check failed:', err);
    process.exit(1);
  }
}

check();
