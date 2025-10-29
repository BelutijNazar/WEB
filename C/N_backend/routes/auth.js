// my-chat-backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs'); // Для хеширования паролей
const jwt = require('jsonwebtoken'); // Для создания JWT-токенов
const db = require('../db'); // Подключение к БД
// 1. Импортируем 'node-fetch' или аналогичный модуль для HTTP-запросов
const fetch = require('node-fetch').default;

const router = express.Router();

const app = express();

// Этот middleware ОБЯЗАТЕЛЕН для парсинга тела POST-запроса
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // Для данных reCAPTCHA также может понадобиться

// 2. ИСПОЛЬЗУЙТЕ ПЕРЕМЕННУЮ ОКРУЖЕНИЯ ДЛЯ СЕКРЕТНОГО КЛЮЧА
// Убедитесь, что вы установили RECAPTCHA_SECRET_KEY в вашем .env файле
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Маршрут регистрации пользователя
router.post('/register', async (req, res) => {
    const { 
        nickname, 
        password: plainPassword,
        'g-recaptcha-response': recaptchaToken
     } = req.body; // Используем plainPassword для ясности

    // 1. Серверная валидация: проверка на пустоту
    if (!nickname || !plainPassword) { // ИСПРАВЛЕНО: добавлен оператор ||
        return res.status(400).json({ message: 'Никнейм и пароль обязательны.' });
    }

    
    // --- ПРОВЕРКА RECAPTCHA ---    
    // 2. Проверка наличия токена reCAPTCHA
    if (!recaptchaToken) {
        return res.status(400).json({ message: 'Проверка reCAPTCHA не пройдена.' });
    }
    // TODO: Здесь можно добавить более строгую серверную валидацию пароля,
    // например, проверку на минимальную длину, наличие цифр/букв, как на фронтенде.

    try {
        // 3. Отправка запроса Google для верификации
        const googleResponse = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            // Отправляем Секретный ключ и Токен
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}` 
        });

        const recaptchaResult = await googleResponse.json();

        // 4. Обработка ответа Google
        if (!recaptchaResult.success) {
            console.error('reCAPTCHA Failed:', recaptchaResult['error-codes']);
            // Возвращаем 403 Forbidden, так как это проблема с безопасностью/проверкой
            return res.status(403).json({ 
                message: 'Ошибка верификации reCAPTCHA. Попробуйте еще раз.' 
            });
        }
        // --- RECAPTCHA ПРОВЕРЕНА УСПЕШНО ---

        // 5. Проверка на существование никнейма в БД
        // Если вы решили использовать public.users для надежности, укажите здесь:
        // const existingUser = await db.query('SELECT * FROM public.users WHERE nickname = $1', [nickname]);
        const existingUser = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким никнеймом уже существует.' });
        }

        // 6. Хеширование пароля
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt); // ИСПРАВЛЕНО: используется hashedPassword

        // 7. Занесение нового пользователя в базу данных
        // Если вы решили использовать public.users для надежности, укажите здесь:
        // const newUser = await db.query(
        //     'INSERT INTO public.users (nickname, password) VALUES ($1, $2) RETURNING user_id, nickname',
        //     [nickname, hashedPassword] // ИСПРАВЛЕНО: используется hashedPassword
        // );
        const newUser = await db.query(
            'INSERT INTO users (nickname, password) VALUES ($1, $2) RETURNING user_id, nickname',
            [nickname, hashedPassword] // ИСПРАВЛЕНО: используется hashedPassword
        );


        // 8. Отправляем успешный ответ
        res.status(201).json({ message: 'Регистрация успешна!', user: newUser.rows[0] });

    } catch (error) {
        console.error('Ошибка регистрации на сервере:', error);
        // Если ошибка "relation "users" does not exist", это все еще проблема подключения/схемы
        if (error.code === '42P01') { // Код ошибки PostgreSQL для "undefined_table"
             console.error("ПОДСКАЗКА: Ошибка 'relation \"users\" does not exist'. Проверьте подключение к БД, имя БД в DATABASE_URL и существование таблицы 'users' в схеме 'public'.");
        }
        res.status(500).json({ message: 'Произошла внутренняя ошибка сервера при регистрации.' });
    }
});

// Маршрут входа пользователя
router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;

    // 1. Серверная валидация: проверка на пустоту
    if (!nickname || !password) { // ИСПРАВЛЕНО: добавлен оператор ||
        return res.status(400).json({ message: 'Никнейм и пароль обязательны.' });
    }

    try {
        // 2. Поиск пользователя по никнейму
        // Если вы решили использовать public.users для надежности, укажите здесь:
        // const userResult = await db.query('SELECT * FROM public.users WHERE nickname = $1', [nickname]);
        const userResult = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }

        // 3. Проверка правильности введенного пароля с хешем из БД
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }

        // 4. Если все проверки пройдены, генерируем JWT-токен
        const token = jwt.sign(
            { id: user.user_id, nickname: user.nickname }, // ИСПРАВЛЕНО: используется user.user_id
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 5. Отправляем успешный ответ с токеном и данными пользователя
        res.status(200).json({
            message: 'Вход успешен!',
            token: token,
            userId: user.user_id, // ИСПРАВЛЕНО: используется user.user_id
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