const { sequelize, Product, CartItem, OrderItem } = require('./models');

async function eliminar() {
  try {
    await sequelize.authenticate();

    const id = 16;

    const product = await Product.findByPk(id);

    if (!product) {
      console.log('No existe un producto con ese ID');
      process.exit(0);
    }

    console.log('Producto encontrado:', product.name);

    await CartItem.destroy({
      where: { product_id: id }
    });

    console.log('Referencias eliminadas de cart_items');

    await OrderItem.destroy({
      where: { product_id: id }
    });

    console.log('Referencias eliminadas de order_items');

    await product.destroy();

    console.log('Producto eliminado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error eliminando producto:', error);
    process.exit(1);
  }
}

eliminar();