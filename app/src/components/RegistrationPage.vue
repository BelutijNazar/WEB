<template>
  <div class="reg-wrapper">

    <div class="form-container">
      <label class="label">Login</label>
      <input type="text" class="input" v-model="nickname" @input="clearErrors('nickname')" />
      <div v-if="nicknameError" class="error-message">{{ nicknameError }}</div>

      <label class="label">Password</label>
      <input type="password" class="input" v-model="password" @input="clearErrors('password')" />
      <div v-if="passwordError" class="error-message">{{ passwordError }}</div>

      <label class="label">Password Check</label>
      <input type="password" class="input" v-model="confirmPassword" @input="clearErrors('confirmPassword')" />
      <div v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</div>

      <div v-if="generalError" class="error-message general-error">{{ generalError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>


      <button class="btn" @click="register">Registration</button>

      <router-link to="/log" class="link">Already have an account?</router-link>
    </div>
  </div>
</template>

<script>
// Импортируем функции валидации из вашего файла validation_register.js
// Убедитесь, что путь к файлу верный относительно этого компонента.
// Если ваш файл находится в WEB/C/validation_register.js, а этот файл в WEB/app/src/components,
// то путь будет '../../../../C/validation_register'
import { validatePassword, validateConfirmPassword } from '../../../C/validation_reg';

export default {
  name: 'RegistrationPage',
  // Добавляем данные для полей ввода и сообщений об ошибках
  data() {
    return {
      nickname: '',
      password: '',
      confirmPassword: '',
      nicknameError: '',
      passwordError: '',
      confirmPasswordError: '',
      generalError: '', // Для ошибок от сервера или сети
      successMessage: '' // Для сообщения об успешной регистрации
    };
  },
  methods: {
    // Метод для очистки конкретной ошибки или всех ошибок
    clearErrors(field = null) {
      if (field === 'nickname') this.nicknameError = '';
      else if (field === 'password') this.passwordError = '';
      else if (field === 'confirmPassword') this.confirmPasswordError = '';
      else {
        this.nicknameError = '';
        this.passwordError = '';
        this.confirmPasswordError = '';
        this.generalError = ''; // Сбрасываем общую ошибку
        this.successMessage = ''; // Сбрасываем сообщение об успехе
      }
    },

    // Метод для обработки регистрации
    async register() {
      this.clearErrors(); // Очищаем все предыдущие ошибки перед новой попыткой

      let isValid = true;

      // 1. Валидация никнейма (просто проверяем, что не пустой)
      if (!this.nickname.trim()) {
        this.nicknameError = 'Логин не может быть пустым.';
        isValid = false;
      }

      // 2. Валидация Пароля с использованием функции из validation_register.js
      const passwordValidationResult = validatePassword(this.password);
      if (passwordValidationResult) {
        this.passwordError = passwordValidationResult;
        isValid = false;
      }

      // 3. Валидация Подтверждения Пароля с использованием функции из validation_register.js
      const confirmPasswordValidationResult = validateConfirmPassword(this.password, this.confirmPassword);
      if (confirmPasswordValidationResult) {
        this.confirmPasswordError = confirmPasswordValidationResult;
        isValid = false;
      }

      // Если есть ошибки клиентской валидации, прерываем выполнение
      if (!isValid) {
        console.log('Форма содержит ошибки клиентской валидации. Отправка на сервер отменена.');
        return; // Останавливаем выполнение, если есть ошибки на клиенте
      }

      // Если клиентская валидация прошла успешно, отправляем запрос на бэкенд
      try {
        const response = await fetch('http://localhost:3000/api/auth/register', { // URL вашего бэкенд API
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname: this.nickname, password: this.password })
        });

        const data = await response.json(); // Парсим JSON-ответ от сервера

        if (response.ok) { // response.ok для статусов 2xx
          // Регистрация успешна
          console.log('Регистрация успешна:', data);
          this.successMessage = data.message || 'Регистрация успешно выполнена!';

          // Очищаем поля формы
          this.nickname = '';
          this.password = '';
          this.confirmPassword = '';

          // Опционально: перенаправляем пользователя на страницу входа через 2 секунды
          setTimeout(() => {
            this.$router.push('/log');
          }, 2000);

        } else {
          // Сервер вернул ошибку (например, 400 Bad Request, 409 Conflict, 500 Internal Server Error)
          console.error('Ошибка регистрации:', data);
          // Показываем общую ошибку от сервера
          this.generalError = data.message || 'Произошла ошибка при регистрации. Пожалуйста, попробуйте еще раз.';
        }
      } catch (error) {
        // Обработка ошибок сети (например, сервер не запущен или нет интернета)
        console.error('Произошла ошибка сети или другое непредвиденное исключение:', error);
        this.generalError = 'Не удалось подключиться к серверу. Проверьте ваше интернет-соединение или запустите сервер.';
      }
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Abel&family=Roboto&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Abel&family=Roboto:wght@300;400;700&display=swap');

.reg-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Abel', sans-serif;
  padding: 20px;
  background-color: #333; /* Добавлен темный фон для всего wrapper-а */
  color: #eee; /* Цвет текста по умолчанию */
}

.form-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #222; /* Темнее фон для контейнера формы */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.label {
  color: #eee; /* Более светлый цвет для меток */
  font-size: 1rem;
  text-align: left;
  margin-bottom: -10px; /* Чтобы уменьшить расстояние между label и input */
}

.input {
  background-color: #444; /* Темнее фон для инпутов */
  border: 1px solid #666; /* Более мягкая обводка */
  border-radius: 10px;
  padding: 12px 15px;
  color: #fff; /* Белый текст в инпутах */
  font-size: 1rem;
}

.input::placeholder {
  color: #aaa; /* Цвет плейсхолдера */
}

.btn {
  background-color: #556B8D; /* Немного измененный цвет кнопки */
  color: #FFFF;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px; /* Отступ сверху для кнопки */
}

.btn:hover {
  background-color: #42566C; /* Более темный цвет при наведении */
}

.link {
  color: #9EC0F0; /* Измененный цвет ссылки для лучшей читаемости на темном фоне */
  text-align: center;
  text-decoration: none; /* Убираем подчеркивание */
  font-size: 0.9rem;
}

.link:hover {
  text-decoration: underline;
}

/* НОВЫЕ СТИЛИ для сообщений об ошибках */
.error-message {
  color: #ff6b6b; /* Ярко-красный цвет для ошибок */
  font-size: 0.8em;
  margin-top: -10px; /* Поднимаем сообщение ближе к полю ввода */
  min-height: 1.2em; /* Чтобы высота элемента не скакала, если нет ошибки */
}

.general-error {
  text-align: center;
  color: #ff6b6b;
  margin-top: 10px;
  font-weight: bold;
}

.success-message {
  text-align: center;
  color: #6bff96; /* Зеленый цвет для успешных сообщений */
  margin-top: 10px;
  font-weight: bold;
}
</style>