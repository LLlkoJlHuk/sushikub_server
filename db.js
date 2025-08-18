const { Sequelize } = require('sequelize');
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development' 
});

// ✅ Отладочная информация
console.log('Database configuration:');
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_PORT:', process.env.DB_PORT);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_USER:', process.env.DB_USER);
console.log('- Environment:', process.env.NODE_ENV);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialectOptions: {
      connectTimeout: 60000, // ✅ Увеличенный таймаут для Beget
      // ✅ ИСПРАВЛЕНИЕ: убраны acquireTimeout и timeout (не поддерживаются mysql2)
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      charset: 'utf8mb4'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000, // ✅ Правильное место для acquire
      idle: 10000
    },
    // ✅ Отключаем логирование в продакшене
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    },
    timezone: '+03:00'
  }
);

// ✅ Тест подключения к базе
sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL connection test successful');
  })
  .catch(err => {
    console.error('❌ MySQL connection test failed:', err.message);
  });

module.exports = sequelize;
