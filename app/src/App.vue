<template>
  <header class="app-header">
      <h1 class="title">Chat Name</h1>
    </header>
    <LoginPage />
</template>

<script>
import LoginPage from './components/LoginPage.vue'

export default {
  name: 'App',
  components: {
    LoginPage
  }
}
</script>
<style>
* {
  background-color: #292F3F;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.title {
  color: white;
  font-family: 'Roboto', sans-serif;
  font-size: 1.5rem;
  font-weight: 300;
  text-align: center;
  margin-top: 20px;
  width: 100%;
  position: absolute;
}
</style>
