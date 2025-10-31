<template>
  <div v-if="authorized" class="gj-page">
    <img
      src="@/assets/picture.jpg"
      class="gjimg"
      
    />
    <button class="btn" @click="goToLogin">Войти снова</button>
  </div>
  <div v-else class="gj-unauthorized">
    <h2>Сессия истекла или вы не авторизованы.</h2>
    <button class="btn" @click="goToLogin">Войти снова</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authorized = ref(false)
const userNickname = ref('')

// 🚪 Очистка сессии (удаляет токен и другие данные)
function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('nickname')
  console.log('Сессия (токен) очищена из localStorage.')
}

async function verifyToken() {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/log')
    return
  }

  try {
    const res = await fetch('https://localhost:8443/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) { // Если 401 (нет токена) или 403 (токен истек)
      clearSession() // Очищаем невалидный токен
      router.push('/log')
      return
    }

    const data = await res.json()
    if (data.valid) {
      authorized.value = true
      userNickname.value = data.user.nickname
    } else {
      clearSession() // Очищаем невалидный токен
      router.push('/log')
    }
  } catch (err) {
    console.error('Ошибка при проверке токена:', err)
    router.push('/log')
  }
}

// 🚀 Проверяем токен при загрузке
onMounted(() => {
  verifyToken()

  // ⏳ Проверка токена каждые 30 секунд
  const interval = setInterval(verifyToken, 30000)

  // 1. Обработчик для закрытия вкладки/браузера
  // Он вызывает clearSession ПЕРЕД закрытием окна
  window.addEventListener('beforeunload', clearSession)

  // 2. Обработчик для ухода со страницы (внутри приложения)
  // Срабатывает, когда компонент уничтожается (например, при
  // использовании router.push или стрелок "назад/вперед" в браузере)
  onBeforeUnmount(() => {
    console.log('Пользователь покидает GoodJobPage. Завершение сессии.');
    
    // Останавливаем проверку токена
    clearInterval(interval) 
    
    // Удаляем обработчик закрытия вкладки, чтобы он не сработал
    // одновременно с навигацией по приложению
    window.removeEventListener('beforeunload', clearSession) 
    
    // **КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:**
    // Завершаем сессию (удаляем токен) при уходе со страницы
    clearSession()
  })
})

// Кнопка выхода
function goToLogin() {
  // Мы также явно вызываем clearSession() здесь,
  // хотя onBeforeUnmount тоже сработает. Это делает код надежнее.
  clearSession() 
  router.push('/log')
}
</script>


<style scoped>
.gjimg {
  height: 500px; 
  max-width: 100%;
  display: block;
  margin-left: auto;
  margin-right: auto;
  padding-top: 100px;
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
</style>