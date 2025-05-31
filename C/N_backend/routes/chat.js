// my-chat-backend/routes/chat.js
const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Ожидаем формат "Bearer TOKEN"

    if (token == null) {
        return res.sendStatus(401); // Нет токена, Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err);
            return res.sendStatus(403); // Токен недействителен или просрочен, Forbidden
        }
        req.user = user; // Сохраняем данные пользователя (id, nickname) из токена в объекте запроса
        next(); // Передаем управление следующему middleware/роуту
    });
};

// =======================================================
// GET /api/chat/messages?otherUserId=<id_другого_пользователя>
// Получить все сообщения для чата между текущим пользователем и другим пользователем
// =======================================================
router.get('/messages', authenticateToken, async (req, res) => {
    const currentUserId = req.user.id; // ID текущего пользователя из JWT
    const otherUserId = parseInt(req.query.otherUserId); // ID собеседника из query-параметра

    if (isNaN(otherUserId) || otherUserId === currentUserId) {
        return res.status(400).json({ message: 'Необходимо указать действительный ID собеседника, отличный от вашего.' });
    }

    try {
        // 1. Находим ID чата между двумя пользователями
        // Используем LEAST и GREATEST для гарантии, что порядок user1_id и user2_id не важен
        const chatResult = await db.query(
            `SELECT id FROM chats WHERE
             (user1_id = $1 AND user2_id = $2) OR
             (user1_id = $2 AND user2_id = $1)`,
            [currentUserId, otherUserId]
        );

        let chatId;
        if (chatResult.rows.length > 0) {
            chatId = chatResult.rows[0].id;
        } else {
            // Если чата нет, создаем его (для первого сообщения)
            const newChatResult = await db.query(
                'INSERT INTO chats (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
                [currentUserId, otherUserId]
            );
            chatId = newChatResult.rows[0].id;
        }

        // 2. Получаем все сообщения для найденного (или созданного) чата
        // Делаем JOIN с таблицей users, чтобы получить никнейм отправителя
        const messagesResult = await db.query(
            `SELECT
                m.id,
                m.chat_id,
                m.sender_id,
                u.nickname AS sender_nickname,
                m.content,
                m.sent_at
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.chat_id = $1
             ORDER BY m.sent_at ASC`,
            [chatId]
        );

        // Также получаем никнейм другого пользователя для отображения
        const otherUserResult = await db.query('SELECT nickname FROM users WHERE id = $1', [otherUserId]);
        const otherUserNickname = otherUserResult.rows[0] ? otherUserResult.rows[0].nickname : 'Неизвестный пользователь';

        res.status(200).json({
            messages: messagesResult.rows,
            chatId: chatId,
            otherUserNickname: otherUserNickname
        });

    } catch (error) {
        console.error('Ошибка при получении сообщений:', error);
        res.status(500).json({ message: 'Произошла ошибка при получении сообщений.' });
    }
});

// =======================================================
// POST /api/chat/messages
// Отправить новое сообщение
// =======================================================
router.post('/messages', authenticateToken, async (req, res) => {
    const { chatId, content } = req.body;
    const senderId = req.user.id; // ID отправителя из JWT
    const senderNickname = req.user.nickname; // Никнейм отправителя из JWT

    if (!chatId || !content || content.trim() === '') {
        return res.status(400).json({ message: 'chatId и содержимое сообщения обязательны.' });
    }

    try {
        // Вставляем новое сообщение в таблицу messages
        const newMessageResult = await db.query(
            'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sent_at',
            [chatId, senderId, content]
        );

        // Опционально: Обновляем время последнего сообщения в таблице chats
        await db.query('UPDATE chats SET last_message_at = NOW() WHERE id = $1', [chatId]);

        res.status(201).json({
            message: 'Сообщение отправлено!',
            sentMessage: { // Возвращаем полные данные о сообщении, чтобы фронтенд мог добавить его
                id: newMessageResult.rows[0].id,
                sent_at: newMessageResult.rows[0].sent_at,
                sender_id: senderId,
                sender_nickname: senderNickname, // Используем никнейм из токена для мгновенного отображения
                content: content
            }
        });

    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        res.status(500).json({ message: 'Произошла ошибка при отправке сообщения.' });
    }
});

module.exports = router;