require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const FRONTEND_URLS = [
    'http://localhost:8080',
    'http://192.168.100.2:8080'
];

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URLS,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({
    origin: FRONTEND_URLS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

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

        const passwordHash = await bcrypt.hash(password, 10);

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

        const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Logged in successfully!', token: token, userId: user.id, nickname: user.nickname });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
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

app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id;
    const { newMessageText } = req.body;

    if (!newMessageText || newMessageText.trim() === '') {
        return res.status(400).json({ message: 'New message text is required' });
    }

    try {
        const [message] = await db.execute(
            'SELECT sender_id, receiver_id FROM messages WHERE id = ?',
            [messageId]
        );

        if (message.length === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message[0].sender_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to edit this message' });
        }

        await db.execute(
            'UPDATE messages SET message = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?',
            [newMessageText, messageId]
        );

        const [updatedMessage] = await db.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.timestamp,
                    s.nickname as sender_nickname, r.nickname as receiver_nickname
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             JOIN users r ON m.receiver_id = r.id
             WHERE m.id = ?`,
            [messageId]
        );

        if (updatedMessage.length > 0) {
            const msg = updatedMessage[0];
            io.to(msg.sender_id.toString()).emit('message_updated', msg);
            io.to(msg.receiver_id.toString()).emit('message_updated', msg);
        }

        res.json({ message: 'Message updated successfully', updatedMessage: updatedMessage[0] });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    try {
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

        await db.execute(
            'DELETE FROM messages WHERE id = ?',
            [messageId]
        );

        io.to(message[0].sender_id.toString()).emit('message_deleted', { messageId: parseInt(messageId), senderId: message[0].sender_id, receiverId: message[0].receiver_id });
        io.to(message[0].receiver_id.toString()).emit('message_deleted', { messageId: parseInt(messageId), senderId: message[0].sender_id, receiverId: message[0].receiver_id });

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('authenticate', async (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            socket.join(socket.user.id.toString());
            console.log(`User ${socket.user.nickname} (${socket.user.id}) authenticated.`);
            socket.emit('authenticated', { userId: socket.user.id, nickname: socket.user.nickname });
            io.emit('user_online', { userId: socket.user.id, nickname: socket.user.nickname });
        } catch (err) {
            console.log('Socket authentication failed:', err.message);
            socket.emit('authentication_error', { message: 'Invalid token' });
            socket.disconnect(true);
        }
    });

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
            const [result] = await db.execute(
                'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                [senderId, receiverId, message]
            );

            const messageId = result.insertId;
            const [newMessageRows] = await db.execute(
                `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.timestamp,
                        s.nickname as sender_nickname, r.nickname as receiver_nickname
                 FROM messages m
                 JOIN users s ON m.sender_id = s.id
                 JOIN users r ON m.receiver_id = r.id
                 WHERE m.id = ?`,
                [messageId]
            );

            if (newMessageRows.length > 0) {
                const newMessage = newMessageRows[0];
                io.to(senderId.toString()).emit('new_message', newMessage);
                io.to(receiverId.toString()).emit('new_message', newMessage);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('message_error', { message: 'Failed to send message' });
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log(`User disconnected: ${socket.user.nickname} (${socket.user.id})`);
            io.emit('user_offline', { userId: socket.user.id, nickname: socket.user.nickname });
        } else {
            console.log(`Socket disconnected: ${socket.id}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
