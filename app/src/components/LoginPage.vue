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

      <button class="btn" @click="login">Login</button>

      <router-link to="/" class="link">Don't have an account?</router-link>
    </div>
  </div>
</template>

<script>
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

      const nicknameValidationResult = validateLoginNickname(this.nickname);
      if (nicknameValidationResult) {
        this.nicknameError = nicknameValidationResult;
        isValid = false;
      }

      const passwordValidationResult = validateLoginPassword(this.password);
      if (passwordValidationResult) {
        this.passwordError = passwordValidationResult;
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      try {
        const response = await fetch('http://192.168.100.2:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nickname: this.nickname, password: this.password })
        });

        const data = await response.json();

        if (response.ok) {
          this.successMessage = data.message || 'Вход успешно выполнен!';

          localStorage.setItem('chatToken', data.token);
          localStorage.setItem('chatUserId', data.userId);
          localStorage.setItem('chatNickname', data.nickname);

          this.nickname = '';
          this.password = '';

          setTimeout(() => {
            this.$router.push('/chat');
          }, 1500);

        } else {
          this.generalError = data.message || 'Произошла ошибка при входе. Пожалуйста, попробуйте еще раз.';
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
  color: #fff; 
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
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

.error-message {
  color: #ff6b6b;
  font-size: 0.8em;
  margin-top: -10px;
  min-height: 1.2em;
}

.general-error {
  text-align: center;
  color: #ff6b6b;
  margin-top: 5px;
  font-weight: bold;
}

.success-message {
  text-align: center;
  color: #6bff96;
  margin-top: 5px;
  font-weight: bold;
}

.link {
  color: #FFFF;
  text-align: center;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 5px;
}

.link:hover {
  text-decoration: underline;
}
</style>
