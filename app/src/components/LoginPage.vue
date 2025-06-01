<template>
  <div class="login-wrapper">
    <div class="form-container">
      <label class="label">Login</label>
      <input type="text" class="input" v-model="nickname" @input="clearErrors('nickname')" />
      <div v-if="nicknameError" class="error-message">{{ nicknameError }}</div>

      <label class="label">Password</label>
      <input type="password" class="input" v-model="password" @input="clearErrors('password')" />
      <div v-if="passwordError" class="error-message">{{ passwordError }}</div>

      <div v-if="generalError" class="error-message general-error">{{ generalError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <router-link to="#" class="full-width-link">
        <button class="btn" @click.prevent="login">Login</button>
      </router-link>

      <router-link to="/" class="link">Don't have an account?</router-link>
    </div>
  </div>
</template>

<script>
// ВАЖНО: Убедитесь, что путь к validation_enter.js верен
// Он должен быть '../../C/validation_enter' если LoginPage.vue в src/components,
// а validation_enter.js в WEB/C/
import { validateLoginNickname, validateLoginPassword } from '../../../C/validation_enter';

export default {
  name: 'LoginPage',
  data() {
    return {
      nickname: '',
      password: '',
      nicknameError: '',
      passwordError: '',
      generalError: '',
      successMessage: ''
    };
  },
  methods: {
    clearErrors(field = null) {
      if (field === 'nickname') {
        this.nicknameError = '';
      } else if (field === 'password') {
        this.passwordError = '';
      } else {
        this.nicknameError = '';
        this.passwordError = '';
        this.generalError = '';
        this.successMessage = '';
      }
    },

    async login() {
      this.clearErrors();

      let isValid = true;

      // 1. Клиентская валидация никнейма с использованием функции из validation_enter.js
      const nicknameValidationResult = validateLoginNickname(this.nickname);
      if (nicknameValidationResult) {
        this.nicknameError = nicknameValidationResult;
        isValid = false;
      }

      // 2. Клиентская валидация пароля с использованием функции из validation_enter.js
      const passwordValidationResult = validateLoginPassword(this.password);
      if (passwordValidationResult) {
        this.passwordError = passwordValidationResult;
        isValid = false;
      }

      // Если есть ошибки клиентской валидации, прерываем отправку на сервер
      if (!isValid) {
        console.log('Форма содержит ошибки клиентской валидации. Отправка на сервер отменена.');
        return;
      }

      // Если клиентская валидация успешна, отправляем запрос на бэкенд
      try {
        const response = await fetch('http://localhost:3000/api/auth/login', { // URL вашего бэкенд API для входа
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname: this.nickname, password: this.password })
        });

        const data = await response.json();

        if (response.ok) { // response.ok для статусов 2xx
          console.log('Вход успешен:', data);
          this.successMessage = data.message || 'Вход успешно выполнен!';

          // Сохраняем токен и информацию о пользователе
          localStorage.setItem('chatToken', data.token);
          localStorage.setItem('chatUserId', data.userId);
          localStorage.setItem('chatNickname', data.nickname);

          this.nickname = '';
          this.password = '';

          // Перенаправляем пользователя на страницу чата
          setTimeout(() => {
            this.$router.push('/chat');
          }, 1500);

        } else {
          console.error('Ошибка входа:', data);
          this.generalError = data.message || 'Произошла ошибка при входе. Пожалуйста, попробуйте еще раз.';
          // Ваш бэкенд возвращает 'Неверный никнейм или пароль.' для обоих случаев (пользователь не найден или пароль не совпадает)
        }
      } catch (error) {
        console.error('Произошла ошибка сети или другое непредвиденное исключение:', error);
        this.generalError = 'Не удалось подключиться к серверу. Проверьте ваше интернет-соединение или запустите сервер.';
      }
    }
  }
}
</script>

<style scoped>
/* Ваши существующие стили */
@import url('https://fonts.googleapis.com/css2?family=Abel&family=Roboto&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Abel&family=Roboto:wght@300;400;700&display=swap');

.login-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Abel', sans-serif;
  padding: 20px;
}

.form-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label {
  color: white;
  font-size: 1rem;
  text-align: left;
}

.input {
  background-color: transparent;
  border: 1px solid #818182;
  border-radius: 10px;
  padding: 10px 15px;
  color: #818182;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.full-width-link {
  width: 100%;
  display: block;
  text-decoration: none;
  color: inherit;
}

.btn {
  background-color: #42566C;
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
}

/* НОВЫЕ СТИЛИ для сообщений об ошибках и успеха */
.error-message {
  color: #ff6b6b; /* Ярко-красный цвет для ошибок */
  font-size: 0.8em;
  margin-top: -10px; /* Поднимаем сообщение ближе к полю ввода */
  min-height: 1.2em; /* Чтобы высота элемента не скакала, если нет ошибки */
}

.general-error {
  text-align: center;
  color: #ff6b6b;
  margin-top: 5px; /* Небольшой отступ от кнопки */
  font-weight: bold;
}

.success-message {
  text-align: center;
  color: #6bff96; /* Зеленый цвет для успешных сообщений */
  margin-top: 5px; /* Небольшой отступ от кнопки */
  font-weight: bold;
}

.link { /* Добавляем стиль для ссылки "Don't have an account?" */
  color: #FFFF; /* Цвет, соответствующий вашему текущему стилю input */
  text-align: center;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 5px; /* Небольшой отступ */
}

.link:hover {
  text-decoration: underline;
}
</style>