// vue.config.js

// 1. Обязательно импортируем модуль fs в самом верху файла
const fs = require('fs'); 

module.exports = {
  // 2. Ваша существующая настройка остается на месте
  transpileDependencies: [], // <-- Ставим здесь запятую

  // 3. Добавляем новую настройку для сервера разработки
  devServer: {
    https: {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    },
    open: true
  }
};