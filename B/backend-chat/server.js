require('dotenv').config();
const express = require('express');
const http = require('http'); // Для Socket.IO
const { Server } = require('socket.io'); // Для Socket.IO
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db'); // Наш пул подключений к БД
const cors = require('cors'); // <-- Добавил импорт пакета 'cors'

const app = express();
const server = http.createServer(app); // Создаем HTTP сервер для Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080", // Разрешаем фронтенду доступ
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Используем пакет 'cors' для Express
// Это middleware должен идти ДО app.use(express.json()) и ДО определения ваших маршрутов
app.use(cors({
    origin: 'http://localhost:8080', // Разрешаем запросы только с этого источника
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешенные методы
    allowedHeaders: ['Content-Type', 'Authorization'] // Разрешенные заголовки
}));

app.use(express.json()); // Middleware для парсинга JSON-тела запросов

// Middleware для защиты маршрутов (проверка JWT)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Если токена нет

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Если токен недействителен (или истек)
        req.user = user; // Добавляем данные пользователя из токена в запрос
        next();
    });
};

// --- Маршруты API для аутентификации ---

// Регистрация пользователя
// Изменил маршрут с '/api/signup' на '/api/auth/register'
app.post('/api/auth/register', async (req, res) => {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ message: 'Nickname and password are required' });
    }

    try {
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE nickname = ?',
            [nickname]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Nickname already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10); // Хешируем пароль

        await db.execute(
            'INSERT INTO users (nickname, password_hash) VALUES (?, ?)',
            [nickname, passwordHash]
        );

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Вход пользователя
// Изменил маршрут с '/api/signin' на '/api/auth/signin' для единообразия,
// но ваш фронтенд сейчас обращается к '/api/auth/register',
// так что если есть отдельная страница входа, там тоже надо будет проверить
// и, возможно, изменить на '/api/auth/signin'
app.post('/api/auth/login', async (req, res) => { // <-- Исправленный маршрут для входа
    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ message: 'Nickname and password are required' });
    }

    try {
        const [users] = await db.execute(
            'SELECT id, nickname, password_hash FROM users WHERE nickname = ?',
            [nickname]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Генерируем JWT
        const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Logged in successfully!', token: token, userId: user.id, nickname: user.nickname });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Маршрут для получения списка пользователей (для выбора собеседника)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        // Получаем всех пользователей, кроме самого текущего
        const [users] = await db.execute(
            'SELECT id, nickname FROM users WHERE id != ?',
            [req.user.id]
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Маршрут для получения истории сообщений между двумя пользователями
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    try {
        const [messages] = await db.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.timestamp,
                    s.nickname as sender_nickname, r.nickname as receiver_nickname
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             JOIN users r ON m.receiver_id = r.id
             WHERE (sender_id = ? AND receiver_id = ?)
                OR (sender_id = ? AND receiver_id = ?)
             ORDER BY timestamp ASC`,
            [currentUserId, otherUserId, otherUserId, currentUserId]
        );
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- Настройка Socket.IO ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Аутентификация через WebSocket (при подключении или отдельным событием)
    // Здесь мы ожидаем, что клиент отправит токен после подключения
    socket.on('authenticate', async (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded; // Привязываем данные пользователя к сокету
            socket.join(socket.user.id.toString()); // Присоединяем пользователя к комнате с его ID
            console.log(`User ${socket.user.nickname} (${socket.user.id}) authenticated.`);
            // Отправляем подтверждение аутентификации клиенту
            socket.emit('authenticated', { userId: socket.user.id, nickname: socket.user.nickname });

            // Оповещаем всех онлайн пользователей о новом онлайн-пользователе (для списка чатов)
            io.emit('user_online', { userId: socket.user.id, nickname: socket.user.nickname });

        } catch (err) {
            console.log('Socket authentication failed:', err.message);
            socket.emit('authentication_error', { message: 'Invalid token' });
            socket.disconnect(true); // Отключаем сокет, если токен недействителен
        }
    });

    // Отправка личного сообщения
    socket.on('send_message', async ({ receiverId, message }) => {
        if (!socket.user) {
            socket.emit('message_error', { message: 'Not authenticated' });
            return;
        }

        const senderId = socket.user.id;

        if (!receiverId || !message) {
            socket.emit('message_error', { message: 'Receiver ID and message are required' });
            return;
        }

        try {
            // Сохраняем сообщение в БД
            const [result] = await db.execute(
                'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                [senderId, receiverId, message]
            );

            // Получаем никнейм получателя для отправки
            const [receiverUser] = await db.execute(
                'SELECT nickname FROM users WHERE id = ?',
                [receiverId]
            );
            const receiverNickname = receiverUser[0] ? receiverUser[0].nickname : 'Unknown';


            const newMessage = {
                id: result.insertId,
                sender_id: senderId,
                receiver_id: receiverId,
                message: message,
                timestamp: new Date().toISOString(), // Используем текущее время на сервере
                sender_nickname: socket.user.nickname,
                receiver_nickname: receiverNickname
            };

            // Отправляем сообщение отправителю
            socket.emit('receive_message', newMessage);

            // Отправляем сообщение получателю, если он онлайн
            // Используем комнату receiverId, которую мы создали при аутентификации
            io.to(receiverId.toString()).emit('receive_message', newMessage);

            console.log(`Message from ${socket.user.nickname} to ${receiverId}: ${message}`);

        } catch (error) {
            console.error('Error saving or sending message:', error);
            socket.emit('message_error', { message: 'Failed to send message' });
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log(`User ${socket.user.nickname} (${socket.user.id}) disconnected.`);
            // Оповещаем всех онлайн пользователей о том, что пользователь ушел в оффлайн
            io.emit('user_offline', { userId: socket.user.id });
        } else {
            console.log('A user disconnected (not authenticated):', socket.id);
        }
    });
});


// Запускаем сервер
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});