<template>
  <header class="app-header">
      <h1 class="title">Chat Name</h1>
    </header>
    <router-view/>
</template>


<script>
export default {
  name: 'RegistrationPage',
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
