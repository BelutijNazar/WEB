<template>
  <div class="chat-page">
    <div class="header"></div>

    <div class="messages">
      <div class="message message--received">Привет! Как дела?</div>
      <div class="message message--sent">Привет! Всё хорошо, спасибо 😊</div>
    </div>

    <div class="input-area">
      <div class="input-wrapper">
        <input
          v-model="message"
          type="text"
          placeholder="Type your message..."
          class="message-input"
        />
        <button class="send-button"></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatPage',
  data() {
    return {
      message: ''
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

.chat-page {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
  background-color: #292F3F;
  font-family: 'Roboto', sans-serif;
  overflow: hidden;
}

.header {
  height: 45px;
  width: 100%;
  background-color: #292F3F;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 20px 120px;
  box-sizing: border-box;
}

.message {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 20px;
  word-break: break-word;
  font-size: 1rem;
}

.message--received {
  background-color: #373E4E;
  align-self: flex-start;
  color: white;
}

.message--sent {
  background-color: #272A35;
  align-self: flex-end;
  color: white;
}

.input-area {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1000px;
  box-sizing: border-box;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.message-input {
  width: 100%;
  height: 45px;
  background-color: #272A35;
  border: none;
  border-radius: 10px;
  padding: 0 50px 0 15px;
  color: white;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  box-sizing: border-box;
}

.send-button {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 35px;
  height: 35px;
  background-color: #373E4E;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
   background-image: url('@/assets/speech-bubble.svg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 20px 20px;
}

@media (max-width: 600px) {
  .message {
    font-size: 0.95rem;
  }

  .message-input {
    height: 40px;
    font-size: 0.95rem;
    padding-right: 45px;
  }

  .send-button {
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }

}
</style>
