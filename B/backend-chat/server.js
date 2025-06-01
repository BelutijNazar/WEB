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

const FRONTEND_URLS = [
    'http://localhost:8080',
    'http://192.168.100.4:8080' // <-- Добавил ваш IP-адрес сюда!
];

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URLS, // <-- Используем массив разрешенных источников для Socket.IO
        methods: ["GET", "POST", "PUT", "DELETE"] // Добавил PUT и DELETE для Socket.IO CORS
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Используем пакет 'cors' для Express
// Это middleware должен идти ДО app.use(express.json()) и ДО определения ваших маршрутов
app.use(cors({
    origin: FRONTEND_URLS, // <-- Используем массив разрешенных источников для Express CORS
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
app.post('/api/auth/login', async (req, res) => {
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

// --- НОВЫЕ МАРШРУТЫ API ДЛЯ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ СООБЩЕНИЙ ---

// Маршрут для редактирования сообщения
app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id; // ID пользователя, который пытается редактировать
    const { newMessageText } = req.body;

    if (!newMessageText || newMessageText.trim() === '') {
        return res.status(400).json({ message: 'New message text is required' });
    }

    try {
        // Проверяем, является ли пользователь отправителем этого сообщения
        const [message] = await db.execute(
            'SELECT sender_id, receiver_id FROM messages WHERE id = ?', // Получаем receiver_id тоже
            [messageId]
        );

        if (message.length === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message[0].sender_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to edit this message' });
        }

        // Обновляем сообщение в базе данных
        await db.execute(
            'UPDATE messages SET message = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?',
            [newMessageText, messageId]
        );

        // Получаем обновленное сообщение для отправки всем участникам чата
        const [updatedMessage] = await db.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.timestamp,
                    s.nickname as sender_nickname, r.nickname as receiver_nickname
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             JOIN users r ON m.receiver_id = r.id
             WHERE m.id = ?`,
            [messageId]
        );

        // Отправляем обновленное сообщение через Socket.IO всем участникам чата
        if (updatedMessage.length > 0) {
            const msg = updatedMessage[0];
            // Отправляем в комнаты отправителя и получателя
            io.to(msg.sender_id.toString()).emit('message_updated', msg);
            io.to(msg.receiver_id.toString()).emit('message_updated', msg);
        }

        res.json({ message: 'Message updated successfully', updatedMessage: updatedMessage[0] });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Маршрут для удаления сообщения
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id; // ID пользователя, который пытается удалить

    try {
        // Проверяем, является ли пользователь отправителем этого сообщения
        const [message] = await db.execute(
            'SELECT sender_id, receiver_id FROM messages WHERE id = ?',
            [messageId]
        );

        if (message.length === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message[0].sender_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this message' });
        }

        // Удаляем сообщение из базы данных
        await db.execute(
            'DELETE FROM messages WHERE id = ?',
            [messageId]
        );

        // Отправляем событие Socket.IO об удалении сообщения
        // Отправляем в комнаты отправителя и получателя
        io.to(message[0].sender_id.toString()).emit('message_deleted', { messageId: parseInt(messageId), senderId: message[0].sender_id, receiverId: message[0].receiver_id });
        io.to(message[0].receiver_id.toString()).emit('message_deleted', { messageId: parseInt(messageId), senderId: message[0].sender_id, receiverId: message[0].receiver_id });

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
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