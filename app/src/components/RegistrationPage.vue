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
        <div ref="recaptchaContainer"></div>
        <div v-if="recaptchaError" class="error-message">{{ recaptchaError }}</div>
      </div>
      <button class="btn" @click="register">Регистрация</button>
      

      <router-link to="/log" class="link">Уже есть аккаунт?</router-link>
    </div>
  </div>
</template>

<script>
import { validatePassword, validateConfirmPassword } from '../../../C/validation_reg';

export default {
  name: 'RegistrationPage',
  data() {
    return {
      // Данные полей ввода
      nickname: '',
      password: '',
      confirmPassword: '',
      
      // Сообщения об ошибках и успехе
      nicknameError: '',
      passwordError: '',
      confirmPasswordError: '',
      generalError: '',
      successMessage: '',
      recaptchaError: '',

      // Данные для reCAPTCHA
      recaptchaToken: null,
      recaptchaWidgetId: null, // Будем хранить ID виджета для этого экземпляра компонента
    };
  },

  mounted() {
    // Этот хук жизненного цикла вызывается КАЖДЫЙ РАЗ, когда вы заходите на страницу регистрации.
    // Идеальное место для инициализации reCAPTCHA.
    this.loadRecaptchaScript();
  },

  methods: {
    /**
     * Управляет загрузкой внешнего скрипта Google reCAPTCHA.
     * Если скрипт уже загружен (например, после возвращения с другой страницы),
     * он просто вызывает отрисовку виджета.
     */
    loadRecaptchaScript() {
      // Проверяем, существует ли уже объект grecaptcha в window.
      if (window.grecaptcha && window.grecaptcha.render) {
        // Если да, скрипт уже загружен. Просто рендерим виджет.
        // Оборачиваем в $nextTick, чтобы гарантировать, что DOM компонента готов.
        this.$nextTick(() => {
          this.renderRecaptcha();
        });
        return;
      }
      
      // Если скрипт еще не загружен, создаем и добавляем его на страницу.
      const script = document.createElement('script');
      // render=explicit - говорит, что мы будем рендерить виджет вручную.
      // onload=onRecaptchaLoadCallback - указывает, какую глобальную функцию вызвать, когда скрипт будет готов.
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallback&render=explicit';
      script.async = true;
      script.defer = true;
      
      // Создаем глобальную функцию-колбэк. Она будет вызвана один раз при первой загрузке скрипта.
      window.onRecaptchaLoadCallback = () => {
        this.$nextTick(() => {
          this.renderRecaptcha();
        });
      };
      
      document.head.appendChild(script);
    },

    /**
     * Отрисовывает виджет reCAPTCHA в DOM-элементе нашего компонента.
     */
    renderRecaptcha() {
      // Проверяем, что контейнер (div с ref) существует и виджет для этого
      // экземпляра компонента еще не был отрисован (recaptchaWidgetId === null).
      if (this.$refs.recaptchaContainer && this.recaptchaWidgetId === null) {
        this.recaptchaWidgetId = window.grecaptcha.render(this.$refs.recaptchaContainer, {
          'sitekey': '6LfTUfsrAAAAANG8Z4OTFXrcYbyWIEjHFf-nEjk8', // ВАШ КЛЮЧ САЙТА
          // Привязываем методы компонента напрямую к колбэкам виджета
          'callback': this.onRecaptchaVerified,
          'expired-callback': this.onRecaptchaExpired,
        });
      }
    },

    /**
     * Вызывается, когда пользователь успешно проходит проверку.
     * @param {string} response - Токен от Google.
     */
    onRecaptchaVerified(response) {
      this.recaptchaToken = response;
      this.recaptchaError = '';
    },

    /**
     * Вызывается, когда срок действия токена истекает.
     */
    onRecaptchaExpired() {
      this.recaptchaToken = null;
      this.recaptchaError = 'Время действия reCAPTCHA истекло. Пожалуйста, пройдите проверку еще раз.';
      // Сбрасываем виджет, чтобы пользователь мог пройти проверку снова.
      if (this.recaptchaWidgetId !== null && typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.reset(this.recaptchaWidgetId);
      }
    },

    // Метод для очистки ошибок
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

    // Метод регистрации
    async register() {
      this.clearErrors();
      let isValid = true;

      // 1. Валидация полей
      if (!this.nickname.trim()) {
        this.nicknameError = 'Логин не может быть пустым.';
        isValid = false;
      }
      const passwordValidationResult = validatePassword(this.password);
      if (passwordValidationResult) {
        this.passwordError = passwordValidationResult;
        isValid = false;
      }
      const confirmPasswordValidationResult = validateConfirmPassword(this.password, this.confirmPassword);
      if (confirmPasswordValidationResult) {
        this.confirmPasswordError = confirmPasswordValidationResult;
        isValid = false;
      }

      // 2. Проверка reCAPTCHA
      if (!this.recaptchaToken) {
        this.recaptchaError = 'Пожалуйста, подтвердите, что вы не робот.';
        isValid = false;
      }

      if (!isValid) return;

      // 3. Отправка на сервер
      try {
        const response = await fetch('https://localhost:8443/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: this.nickname,
            password: this.password,
            'g-recaptcha-response': this.recaptchaToken,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          this.successMessage = data.message || 'Регистрация успешно выполнена!';
          this.nickname = '';
          this.password = '';
          this.confirmPassword = '';
          setTimeout(() => {
            this.$router.push('/log');
          }, 2000);
        } else {
          this.generalError = data.message || 'Произошла ошибка при регистрации.';
        }
      } catch (error) {
        this.generalError = 'Не удалось подключиться к серверу.';
      } finally {
        // Всегда сбрасываем reCAPTCHA после попытки отправки, используя ID виджета.
        if (this.recaptchaWidgetId !== null && typeof window.grecaptcha !== 'undefined') {
          window.grecaptcha.reset(this.recaptchaWidgetId);
          this.recaptchaToken = null;
        }
      }
    },
  },
};
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