const express = require('express');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const db = require('../db'); 

const router = express.Router();

router.post('/register', async (req, res) => {
    const { nickname, password: plainPassword } = req.body; 

    if (!nickname || !plainPassword) { 
        return res.status(400).json({ message: 'Никнейм и пароль обязательны.' });
    }

    try {

        const existingUser = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким никнеймом уже существует.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt); 
        const newUser = await db.query(
            'INSERT INTO users (nickname, password) VALUES ($1, $2) RETURNING user_id, nickname',
            [nickname, hashedPassword] 
        );

        res.status(201).json({ message: 'Регистрация успешна!', user: newUser.rows[0] });

    } catch (error) {
        console.error('Ошибка регистрации на сервере:', error);
        if (error.code === '42P01') { 
             console.error("ПОДСКАЗКА: Ошибка 'relation \"users\" does not exist'. Проверьте подключение к БД, имя БД в DATABASE_URL и существование таблицы 'users' в схеме 'public'.");
        }
        res.status(500).json({ message: 'Произошла внутренняя ошибка сервера при регистрации.' });
    }
});

router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;

    if (!nickname || !password) { 
        return res.status(400).json({ message: 'Никнейм и пароль обязательны.' });
    }

    try {
        
        const userResult = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }

        const token = jwt.sign(
            { id: user.user_id, nickname: user.nickname }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Вход успешен!',
            token: token,
            userId: user.user_id, 
            nickname: user.nickname
        });

    } catch (error) {
        console.error('Ошибка входа на сервере:', error);
        if (error.code === '42P01') {
             console.error("ПОДСКАЗКА: Ошибка 'relation \"users\" does not exist'. Проверьте подключение к БД, имя БД в DATABASE_URL и существование таблицы 'users' в схеме 'public'.");
        }
        res.status(500).json({ message: 'Произошла внутренняя ошибка сервера при входе.' });
    }
});

module.exports = router;