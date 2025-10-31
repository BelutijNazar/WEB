// my-chat-backend/app.js
require('dotenv').config(); // Загружаем переменные окружения из .env файла

// 1. Импортируем встроенные модули Node.js для HTTPS и работы с файлами
const https = require('https');
const fs = require('fs');

const express = require('express');
const cors = require('cors'); // Для обработки CORS-запросов
const authRoutes = require('./routes/auth'); // Подключаем маршруты аутентификации
const chatRoutes = require('./routes/chat'); // Подключаем маршруты чата

const app = express();
// 2. Рекомендуется использовать другой порт для HTTPS, чтобы избежать путаницы
const PORT = process.env.HTTPS_PORT || 8443; 

// Конфигурация CORS: разрешаем запросы только с вашего фронтенд-приложения
// ВАЖНО: Убедитесь, что ваш фронтенд теперь тоже будет обращаться к https://localhost:8443
const corsOptions = {
    origin: 'https://localhost:8080', // Оставьте порт фронтенда как есть
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // Применяем CORS middleware

// Middleware для парсинга JSON-тела запросов (req.body)
app.use(express.json());

// Подключаем маршруты API
app.use('/api/auth', authRoutes); 
app.use('/api/chat', chatRoutes); 

// 3. Создаем опции для HTTPS сервера, читая созданные вами файлы сертификатов
// Этот код ожидает, что key.pem и cert.pem находятся в той же папке, что и app.js
const httpsOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// 4. Заменяем app.listen на https.createServer
https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`✅ HTTPS Сервер успешно запущен на https://localhost:${PORT}`);
});

// Старый запуск сервера нужно удалить или закомментировать:
/*
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
*/