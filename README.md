# SushiKub Server

Серверная часть веб-приложения для доставки суши и роллов, построенная на Node.js с использованием Express и PostgreSQL.

## 🚀 Технологии

- **Node.js** - Среда выполнения JavaScript
- **Express.js** - Веб-фреймворк
- **PostgreSQL** - Реляционная база данных
- **Sequelize** - ORM для работы с базой данных
- **JWT** - Аутентификация и авторизация
- **Multer** - Обработка загрузки файлов
- **Helmet** - Безопасность HTTP заголовков
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Ограничение частоты запросов

## 📁 Структура проекта

```
sushikub_server/
├── controllers/      # Контроллеры для обработки запросов
│   ├── bannerController.js      # Управление баннерами
│   ├── categoryController.js    # Управление категориями
│   ├── frontpadController.js    # Интеграция с FrontPad
│   ├── productController.js     # Управление товарами
│   ├── settingsController.js    # Управление настройками
│   ├── typeController.js        # Управление типами товаров
│   └── userController.js        # Управление пользователями
├── db.js            # Конфигурация базы данных
├── error/           # Обработка ошибок
│   └── ApiError.js  # Класс для API ошибок
├── index.js         # Главный файл сервера
├── middleware/      # Промежуточное ПО
│   ├── authMiddleware.js        # Аутентификация
│   ├── checkRoleMiddleware.js   # Проверка ролей
│   └── ErrorHandlerMiddleware.js # Обработка ошибок
├── models/          # Модели базы данных
│   └── models.js   # Определение моделей Sequelize
├── routes/          # Маршруты API
│   ├── authRouter.js            # Аутентификация
│   ├── bannerRouter.js          # Баннеры
│   ├── categoryRouter.js        # Категории
│   ├── frontpadRouter.js        # FrontPad интеграция
│   ├── index.js                 # Главный роутер
│   ├── productRouter.js         # Товары
│   └── settingsRouter.js        # Настройки
├── static/          # Статические файлы
└── package.json     # Зависимости и скрипты
```

## 🛠 Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### Установка зависимостей

```bash
npm install
```

### Настройка базы данных

1. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE sushikub;
CREATE USER sushikub WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sushikub TO sushikub;
```

2. Создайте файл `.env` в корне проекта:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sushikub
DB_USER=sushikub
DB_PASSWORD=your_password
SECRET_KEY=your_secret_key
PORT=5000
NODE_ENV=development
```

### Запуск в режиме разработки

```bash
npm run dev
```

Сервер будет доступен по адресу: `http://localhost:5000`

## 🌐 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/check` - Проверка токена

### Товары
- `GET /api/product/` - Получение списка товаров
- `POST /api/product/` - Создание товара
- `PUT /api/product/:id` - Обновление товара
- `DELETE /api/product/:id` - Удаление товара

### Категории
- `GET /api/category/` - Получение списка категорий
- `POST /api/category/` - Создание категории
- `PUT /api/category/:id` - Обновление категории
- `DELETE /api/category/:id` - Удаление категории

### Баннеры
- `GET /api/banner/` - Получение списка баннеров
- `POST /api/banner/` - Создание баннера
- `PUT /api/banner/:id` - Обновление баннера
- `DELETE /api/banner/:id` - Удаление баннера

### Настройки
- `GET /api/settings/` - Получение настроек
- `POST /api/settings/` - Создание настройки
- `PUT /api/settings/:id` - Обновление настройки
- `DELETE /api/settings/:id` - Удаление настройки

## 🔒 Безопасность

### Аутентификация
- JWT токены для аутентификации
- Автоматическое обновление токенов
- Проверка ролей пользователей

### Защита от атак
- **Helmet** - Безопасные HTTP заголовки
- **Rate Limiting** - Ограничение частоты запросов
- **CORS** - Контроль доступа к ресурсам
- **Валидация входных данных** - Проверка всех входящих данных

### Rate Limiting
- **Публичные API**: 15000 запросов за 15 минут
- **Аутентификация**: 10 попыток входа за 15 минут
- **Админские операции**: 1000 операций за 15 минут

## 📊 База данных

### Модели

- **User** - Пользователи системы
- **Product** - Товары (суши, роллы)
- **Category** - Категории товаров
- **Type** - Типы товаров
- **Banner** - Баннеры для главной страницы
- **Setting** - Настройки приложения
- **Order** - Заказы пользователей

### Миграции

```bash
# Создание таблиц
npx sequelize-cli db:migrate

# Откат миграций
npx sequelize-cli db:migrate:undo

# Заполнение тестовыми данными
npx sequelize-cli db:seed:all
```

## 📁 Загрузка файлов

### Поддерживаемые форматы
- JPEG/JPG
- PNG
- WebP

### Ограничения
- Максимальный размер файла: 50MB
- Автоматическое создание директорий
- Безопасные имена файлов

## 🚀 Производительность

### Оптимизации
- **Connection Pooling** для базы данных
- **Кэширование** статических файлов
- **Сжатие** ответов сервера
- **Асинхронная обработка** файлов

## 🔍 Логирование

### Уровни логирования
- **Error** - Критические ошибки
- **Warn** - Предупреждения
- **Info** - Информационные сообщения
- **Debug** - Отладочная информация (только в development)

### Ротация логов
- Автоматическая ротация по размеру
- Сжатие старых логов
- Хранение логов за последние 30 дней