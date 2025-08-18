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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // ✅ ИСПРАВЛЕНИЕ: Привязка ко всем интерфейсам

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ✅ ИСПРАВЛЕНИЕ: Правильная настройка CORS для продакшена
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://sushi.lllkojlhuk.ru',
        'http://sushi.lllkojlhuk.ru',
        process.env.ALLOWED_ORIGIN
      ]
    : true, // В разработке разрешаем все
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ДОБАВЛЕНИЕ: Тестовый endpoint для проверки работы
app.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

app.get('/:filename.webp', (req, res) => {
  const filePath = path.join(__dirname, 'static', req.params.filename + '.webp');
  res.sendFile(filePath);
});

app.get('/:filename.jpg', (req, res) => {
  const filePath = path.join(__dirname, 'static', req.params.filename + '.jpg');
  res.sendFile(filePath);
});

app.get('/:filename.png', (req, res) => {
  const filePath = path.join(__dirname, 'static', req.params.filename + '.png');
  res.sendFile(filePath);
});

app.use(express.static(path.resolve(__dirname, 'static')));

// Rate limiting для публичных API (снижено для старой версии Node.js)
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5000, // ✅ ИСПРАВЛЕНИЕ: Снижено для совместимости
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.startsWith('/static/') || 
           req.path.match(/\.(webp|jpg|jpeg|png|gif|ico|css|js|svg)$/) ||
           req.path.startsWith('/api/auth/') ||
           req.path.startsWith('/api/admin/') ||
           req.path === '/test'; // ✅ ДОБАВЛЕНИЕ: Пропускаем тестовый endpoint
  }
});

app.use('/api/', publicApiLimiter);

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', adminAuthLimiter);

const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many admin operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/admin/', adminApiLimiter);

// ✅ ИСПРАВЛЕНИЕ: Упрощенная настройка файлов для совместимости
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // Снижено до 10MB
  },
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

app.use('/api', router);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const start = async () => {
    try {
      console.log('Starting server...');
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Host:', HOST);
      console.log('Port:', PORT);
      
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      await sequelize.sync();
      console.log('Database synchronized successfully.');
      
      // ✅ ИСПРАВЛЕНИЕ: Привязка к HOST (0.0.0.0) вместо localhost
      const server = app.listen(PORT, HOST, () => {
        console.log(`Server is running on ${HOST}:${PORT}`);
        console.log(`Server process PID: ${process.pid}`);
      });
      
      // ✅ ДОБАВЛЕНИЕ: Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        server.close(() => {
          console.log('Process terminated');
        });
      });
      
    } catch (e) {
      console.error('Error starting server:', e);
      process.exit(1);
    }
  }

  start();
}
