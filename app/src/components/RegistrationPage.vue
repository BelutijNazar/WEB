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
import { validatePassword, validateConfirmPassword } from '../../../C/validation_reg';

export default {
  name: 'RegistrationPage',
  data() {
    return {
      nickname: '',
      password: '',
      confirmPassword: '',
      nicknameError: '',
      passwordError: '',
      confirmPasswordError: '',
      generalError: '',
      successMessage: ''
    };
  },
  methods: {
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

    async register() {
      this.clearErrors();

      let isValid = true;

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

      if (!isValid) {
        return;
      }

      try {
        const response = await fetch('http://192.168.100.2:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname: this.nickname, password: this.password })
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
          this.generalError = data.message || 'Произошла ошибка при регистрации. Пожалуйста, попробуйте еще раз.';
        }
      } catch (error) {
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
