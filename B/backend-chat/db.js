require('dotenv').config();
const mysql = require('mysql2/promise'); // Используем промисную версию для удобства

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        // Создаем базу данных, если она не существует
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        connection.release(); // Освобождаем соединение

        const newConnection = await pool.getConnection();
        // Используем новую базу данных для создания таблиц
        await newConnection.query(`USE ${process.env.DB_NAME}`);

        // Создаем таблицу users
        await newConnection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nickname VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создаем таблицу messages
        await newConnection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            );
        `);
        newConnection.release();
        console.log('Database and tables initialized successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1); // Выход из приложения при ошибке базы данных
    }
}

// Вызываем инициализацию при запуске
initializeDatabase();

module.exports = pool;