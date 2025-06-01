require('dotenv').config();

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error("---------------------------------------------------------------------------");
    console.error("ОШИБКА: Переменная окружения DATABASE_URL не установлена!");
    console.error("Пожалуйста, убедитесь, что у вас есть файл .env в корне проекта");
    console.error("и он содержит строку вида: DATABASE_URL=\"postgresql://user:password@host:port/database\"");
    console.error("Или что эта переменная установлена в вашем окружении развертывания.");
    console.error("---------------------------------------------------------------------------");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false 
});

pool.on('connect', (client) => {
    console.log('[DB] Клиент успешно подключился к PostgreSQL.');
});

pool.on('error', (err, client) => {
    console.error('[DB] Неожиданная ошибка на неактивном клиенте (idle client):', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
};
