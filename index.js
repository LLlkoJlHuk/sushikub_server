require("dotenv").config();
const express = require("express");
const sequelize = require("./db");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const router = require("./routes/index");
const errorHandler = require("./middleware/ErrorHandlerMiddleware");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 5000;

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Настройка CORS с ограничениями
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? allowedOrigins
    : true, // В разработке разрешаем все
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.resolve(__dirname, 'static')));

// Rate limiting для 1000+ пользователей в день (только для публичных API)
// Архитектура: Один админ-аккаунт + публичные пользователи без авторизации
// Расчет: 1000 пользователей ÷ 24 часа ÷ 4 (15-мин окна) = ~10 пользователей одновременно
// Каждый пользователь может сделать ~1500 запросов за 15 минут (активная сессия)
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 15000, // 15000 запросов на 15 минут с одного IP для публичных API
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем статические файлы, изображения и админские endpoints
    return req.path.startsWith('/static/') || 
           req.path.match(/\.(webp|jpg|jpeg|png|gif|ico|css|js|svg)$/) ||
           req.path.startsWith('/api/auth/') ||
           req.path.startsWith('/api/admin/');
  }
});

app.use('/api/', publicApiLimiter);

// Rate limiting для аутентификации администратора (только один аккаунт)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток входа на 15 минут (достаточно для одного админа)
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', adminAuthLimiter);

// Rate limiting для админских операций (управление товарами, заказами)
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // 1000 операций на 15 минут с одного IP для админки
  message: 'Too many admin operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/admin/', adminApiLimiter);

// Улучшенная обработка файлов
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  parseNested: false,
  // Валидация типов файлов
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
  }
}));

// Статические файлы React приложения (только в продакшене)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'static', 'client')));
  
  // Обработка SPA маршрутов - всегда возвращаем index.html для клиентских маршрутов
  app.get('*', (req, res, next) => {
    // Пропускаем API запросы и статические файлы
    if (req.path.startsWith('/api/') || 
        req.path.match(/\.(webp|jpg|jpeg|png|gif|ico|css|js|svg|txt|json)$/)) {
      return next();
    }
    
    res.sendFile(path.resolve(__dirname, 'static', 'client', 'index.html'));
  });
}

app.use('/api', router);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const start = async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      await sequelize.sync();
      console.log('Database synchronized successfully.');
      app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    } catch (e) {
      console.log('Error starting server:', e);
    }
  }

  start();
}