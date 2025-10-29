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

    if (!nickname || !password) {
        return res.status(400).json({ message: 'Никнейм и пароль обязательны.' });
    }

    try {
        let userResult;
        let isVulnerableMode = false;

        // ------------------------------------------------------------------
        //          !!! УЯЗВИМАЯ ВЕРСИЯ (ОСТАВЛЕНА ДЛЯ ДЕМОНСТРАЦИИ) !!!
        // ------------------------------------------------------------------
        // Чтобы ПОКАЗАТЬ АТАКУ, раскомментируйте этот блок
        // и закомментируйте блок "ЗАЩИЩЕННАЯ ВЕРСИЯ" ниже.
        
        //const vulnerableQuery = "SELECT * FROM users WHERE nickname = '" + nickname + "'";
        //userResult = await db.query(vulnerableQuery);
        //isVulnerableMode = true;
        
        
        // ------------------------------------------------------------------
        //          --- ЗАЩИЩЕННАЯ ВЕРСИЯ (С ПАРАМЕТРИЗАЦИЕЙ) ---
        // ------------------------------------------------------------------
        const queryText = 'SELECT * FROM users WHERE nickname = $1';
        const values = [nickname];
        userResult = await db.query(queryText, values);
        

        // ------------------------------------------------------------------
        //          --- ЛОГИКА АНАЛИЗА РЕЗУЛЬТАТА ---
        // ------------------------------------------------------------------

        const user = userResult.rows[0];
        const userCount = userResult.rowCount;

        // --- ПРОВЕРКА ДЛЯ ДЕМОНСТРАЦИИ УСПЕШНОЙ АТАКИ ---
        if (isVulnerableMode && userCount >= 1) {
             console.warn(`[!!!] Авторизация обходится для пользователя: '${user.nickname}'`);
            const token = jwt.sign(
                { id: user.user_id, nickname: user.nickname },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                message: 'Вход успешен!',
                token: token,
                userId: user.user_id,
                nickname: user.nickname
            });
        }
        
        // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН (сработает на SQL-инъекцию или просто неверный ник)
        if (!user) {
            // ВЫВОДИМ ОШИБКУ В КОНСОЛЬ БЭКЕНДА
            console.error(`[AUTH-FAIL] Попытка входа отклонена. Пользователь '${nickname}' не найден.`);
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);

        // ЕСЛИ ПАРОЛЬ НЕВЕРНЫЙ
        if (!isMatch) {
            console.error(`[AUTH-FAIL] Попытка входа отклонена для пользователя '${nickname}'. Неверный пароль.`);
            return res.status(401).json({ message: 'Неверный никнейм или пароль.' });
        }

        // ЕСЛИ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ
        const token = jwt.sign(
            { id: user.user_id, nickname: user.nickname },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // ВЫВОДИМ СООБЩЕНИЕ ОБ УСПЕШНОМ ВХОДЕ В КОНСОЛЬ БЭКЕНДА
        console.log(`[AUTH-SUCCESS] Клиент '${user.nickname}' (ID: ${user.user_id}) успешно зашел.`);

        res.status(200).json({
            message: 'Вход успешен!',
            token: token,
            userId: user.user_id,
            nickname: user.nickname
        });

    } catch (error) {
        console.error('Ошибка входа на сервере:', error);
        res.status(500).json({ message: 'Произошла внутренняя ошибка сервера при входе.' });
    }
});

module.exports = router;