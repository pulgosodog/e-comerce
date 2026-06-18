const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('Iniciando migración...');

    const queryInterface = sequelize.getQueryInterface();

    const usersTable = await queryInterface.describeTable('users');

    if (!usersTable.phone) {
      await queryInterface.addColumn('users', 'phone', {
        type: require('sequelize').DataTypes.STRING(50),
        allowNull: true
      });

      console.log('Columna phone agregada a users.');
    } else {
      console.log('La columna phone ya existe.');
    }

    const tables = await queryInterface.showAllTables();

    if (!tables.includes('user_addresses')) {
      await queryInterface.createTable('user_addresses', {
        address_id: {
          type: require('sequelize').DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: require('sequelize').DataTypes.INTEGER,
          allowNull: false
        },
        label: {
          type: require('sequelize').DataTypes.STRING(100),
          allowNull: true
        },
        full_address: {
          type: require('sequelize').DataTypes.TEXT,
          allowNull: false
        },
        phone: {
          type: require('sequelize').DataTypes.STRING(50),
          allowNull: true
        },
        latitude: {
          type: require('sequelize').DataTypes.DECIMAL(10, 8),
          allowNull: true
        },
        longitude: {
          type: require('sequelize').DataTypes.DECIMAL(11, 8),
          allowNull: true
        },
        is_default: {
          type: require('sequelize').DataTypes.BOOLEAN,
          defaultValue: false
        },
        created_at: {
          type: require('sequelize').DataTypes.DATE,
          allowNull: false,
          defaultValue: require('sequelize').DataTypes.NOW
        },
        updated_at: {
          type: require('sequelize').DataTypes.DATE,
          allowNull: false,
          defaultValue: require('sequelize').DataTypes.NOW
        }
      });

      console.log('Tabla user_addresses creada.');
    } else {
      console.log('La tabla user_addresses ya existe.');
    }

    console.log('Migración completada correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();