const { Sequelize } = require('sequelize');
require('dotenv').config({ path: process.env.NODE_ENV == 'production' ? '.env' : '.env.development' });

module.exports = new Sequelize(
  process.env.DB_NAME, // Название базы данных
  process.env.DB_USER, // Пользователь
  process.env.DB_PASSWORD, // Пароль
  {
    dialect: 'mysql', // Изменено с 'postgres' на 'mysql'
    host: process.env.DB_HOST, // Хост
    port: process.env.DB_PORT, // Порт
    dialectOptions: {
      connectTimeout: 30000, // Увеличенный таймаут для надёжности
    },
    logging: process.env.NODE_ENV === 'production' ? false : console.log, // Отключение логов в продакшене
  }
);