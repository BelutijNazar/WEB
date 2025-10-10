// my-chat-backend/app.js
require('dotenv').config(); // Загружаем переменные окружения из .env файла

const express = require('express');
const cors = require('cors'); // Для обработки CORS-запросов
const authRoutes = require('./routes/auth'); // Подключаем маршруты аутентификации
const chatRoutes = require('./routes/chat'); // Подключаем маршруты чата

const app = express();
const PORT = process.env.PORT || 3000; // Используем порт из .env или 3000 по умолчанию

// Конфигурация CORS: разрешаем запросы только с вашего фронтенд-приложения (порт 8080)
const corsOptions = {
    origin: 'http://localhost:8080', // Убедитесь, что это соответствует порту вашего Vue.js фронтенда
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Разрешенные HTTP методы
    credentials: true, // Разрешает передачу куки и заголовков авторизации (JWT)
    optionsSuccessStatus: 204 // Для некоторых старых браузеров
};
app.use(cors(corsOptions)); // Применяем CORS middleware

// Middleware для парсинга JSON-тела запросов (req.body)
app.use(express.json());

// Подключаем маршруты API
app.use('/api/auth', authRoutes); // Все маршруты из auth.js будут доступны по /api/auth/...
app.use('/api/chat', chatRoutes); // Все маршруты из chat.js будут доступны по /api/chat/...

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});