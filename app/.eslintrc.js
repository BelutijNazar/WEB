module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: '@babel/eslint-parser'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },
  globals: {
    // Объявляем 'grecaptcha' как глобальную переменную,
    // доступную только для чтения ('readonly') или для записи ('writable').
    // В случае reCAPTCHA достаточно 'readonly'.
    grecaptcha: 'readonly' 
  }
}
