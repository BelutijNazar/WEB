<template>
  <div class="login-wrapper">
   
    <div class="form-container">
      <label class="label">Login</label>
      <input type="text" class="input" />

      <label class="label">Password</label>
      <input type="password" class="input" />

      <button class="btn">Login</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginPage'
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
  color: #818182;
  font-size: 1rem;
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
}

</style>
