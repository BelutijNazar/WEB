<template>
  <div class="reg-wrapper">

    <div class="form-container">
      <label class="label">Логин</label>
      <input type="text" class="input" v-model="nickname" @input="clearErrors('nickname')" />
      <div v-if="nicknameError" class="error-message">{{ nicknameError }}</div>

      <label class="label">Пароль</label>
      <input type="password" class="input" v-model="password" @input="clearErrors('password')" />
      <div v-if="passwordError" class="error-message">{{ passwordError }}</div>

      <label class="label">Повторить пароль</label>
      <input type="password" class="input" v-model="confirmPassword" @input="clearErrors('confirmPassword')" />
      <div v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</div>

      <div v-if="generalError" class="error-message general-error">{{ generalError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <div class="recaptcha-wrapper">
        <div 
          class="g-recaptcha" 
          data-sitekey="6LfTUfsrAAAAANG8Z4OTFXrcYbyWIEjHFf-nEjk8" 
          data-callback="recaptchaCallback" 
          data-expired-callback="recaptchaExpired"
        ></div>
        <div v-if="recaptchaError" class="error-message">{{ recaptchaError }}</div>
      </div>
      <button class="btn" @click="register">Регистрация</button>
      

      <router-link to="/log" class="link">Уже есть аккаунт?</router-link>
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
      generalError: '', 
      successMessage: '', 
      recaptchaToken: null,
      recaptchaError: '',
    };
  },
  //mounted() {
    // Глобальное подключение колбэков reCAPTCHA к методам Vue
    //window.recaptchaCallback = this.recaptchaCallback;
    //window.recaptchaExpired = this.recaptchaExpired;
  //},
  mounted() {
    const checkInterval = setInterval(() => {
      if (window.isRecaptchaApiLoaded) {
        clearInterval(checkInterval);
        this.renderRecaptcha();
      }
    }, 100);
  },
  beforeUnmount() {
    // Очистка глобальных функций при удалении компонента
    delete window.recaptchaCallback;
    delete window.recaptchaExpired;
  },
  methods: {
    // МЕТОДЫ-КОЛБЭКИ reCAPTCHA
    recaptchaCallback(response) {
      // Вызывается, когда пользователь успешно проходит проверку (response — это токен)
      this.recaptchaToken = response;
      this.recaptchaError = ''; // Очищаем ошибку при успешном прохождении
    },
    recaptchaExpired() {
      // Вызывается, когда токен истекает (через ~2 минуты)
      this.recaptchaToken = null;
      this.recaptchaError = 'Время действия reCAPTCHA истекло. Пожалуйста, пройдите проверку еще раз.';
      // Перезагружаем виджет, чтобы показать его снова (если это не происходит автоматически)
      if (typeof grecaptcha !== 'undefined') {
        grecaptcha.reset();
      }
    },
    renderRecaptcha() {
      if (this.$refs.recaptcha) {
        this.widgetId = window.grecaptcha.render(this.$refs.recaptcha, {
          sitekey: '6LfhetErAAAAAL7yWxchYiW2K9mT-ficTyVirrjn',
          callback: (token) => {
            this.captchaVerified = true;
            this.captchaResponse = token;
          },
          'expired-callback': () => {
            this.captchaVerified = false;
            this.captchaResponse = '';
            if (this.widgetId !== null) {
              window.grecaptcha.reset(this.widgetId);
            }
          },
        });
      }
    },
    // Метод для очистки конкретной ошибки или всех ошибок
    clearErrors(field = null) {
      if (field === 'nickname') this.nicknameError = '';
      else if (field === 'password') this.passwordError = '';
      else if (field === 'confirmPassword') this.confirmPasswordError = '';
      else {
        this.nicknameError = '';
        this.passwordError = '';
        this.confirmPasswordError = '';
        this.generalError = ''; 
        this.successMessage = ''; 
      }
    },

    
    // Метод для обработки регистрации
    async register() {
      this.clearErrors(); 
      let isValid = true;
      // 1. Валидация никнейма 
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

      // 4. ПРОВЕРКА reCAPTCHA
      if (!this.recaptchaToken) {
        this.recaptchaError = 'Пожалуйста, подтвердите, что вы не робот.';
        isValid = false;
      }

      // Если есть ошибки клиентской валидации, прерываем выполнение
      if (!isValid) {
        console.log('Форма содержит ошибки клиентской валидации. Отправка на сервер отменена.');
        return; 
      }

      // Если клиентская валидация прошла успешно, отправляем запрос на бэкенд
      try {
        const response = await fetch('http://localhost:3000/api/auth/register', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            nickname: this.nickname, 
            password: this.password,
            // ОТПРАВКА ТОКЕНА reCAPTCHA НА СЕРВЕР!
            'g-recaptcha-response': this.recaptchaToken
           })
        });

        const data = await response.json(); // Парсим JSON-ответ от сервера

        if (response.ok) { 
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
      } finally {
        // Всегда сбрасываем reCAPTCHA после попытки отправки, чтобы токен не использовался повторно
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.reset();
          this.recaptchaToken = null;
        }
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
  color: #eee; 
}

.form-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 30px;
}

.label {
  color: #eee; 
  font-size: 1rem;
  text-align: left;
  margin-bottom: -10px; 
}

.input {
  border: 1px solid #666; 
  border-radius: 10px;
  padding: 12px 15px;
  color: #fff; 
  font-size: 1rem;
}

.input::placeholder {
  color: #aaa; 
}

.btn {
  background-color: #556B8D; 
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
  margin-top: 10px; 
}

.btn:hover {
  background-color: #42566C; 
}

.link {
  color: #FFF; 
  text-align: center;
  text-decoration: none; 
  font-size: 0.9rem;
}

.link:hover {
  text-decoration: underline;
}

.error-message {
  color: #ff6b6b; 
  font-size: 0.8em;
  margin-top: -10px; 
  min-height: 1.2em; 
}

.general-error {
  text-align: center;
  color: #ff6b6b;
  margin-top: 10px;
  font-weight: bold;
}

.success-message {
  text-align: center;
  color: #6bff96; 
  margin-top: 10px;
  font-weight: bold;
}
</style>