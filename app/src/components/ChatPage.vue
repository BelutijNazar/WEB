<template>
  <div class="chat-page">
    <div class="header"></div>

    <div class="messages">
      <div v-for="(msg, index) in messages" :key="msg.id" class="message-group">
        <div
          v-if="shouldShowTimestamp(msg.timestamp, index > 0 ? messages[index - 1].timestamp : null)"
          class="timestamp"
        >
          {{ formatTimestamp(msg.timestamp) }}
        </div>
        <div :class="['message', msg.isSent ? 'message--sent' : 'message--received']">
          {{ msg.text }}
        </div>
      </div>
    </div>

    <div class="input-area">
      <div class="input-wrapper">
        <input
          v-model="message"
          type="text"
          placeholder="Type your message..."
          class="message-input"
          @keyup.enter="sendMessage"
        />
        <button class="send-button" @click="sendMessage"></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatPage',
  data() {
    return {
      message: '', 
      messages: [ 
        { id: 1, text: 'Привет! Как дела?', isSent: false, timestamp: new Date('2025-05-30T10:30:00') }, 
        { id: 2, text: 'Привет! Всё хорошо, спасибо 😊', isSent: true, timestamp: new Date('2025-05-31T12:05:00') }, 
        { id: 3, text: 'Чем занимаешься?', isSent: false, timestamp: new Date('2025-05-31T12:05:30') }, 
        { id: 4, text: 'Работаю над Vue проектом.', isSent: true, timestamp: new Date('2025-05-31T12:06:15') }, 
        { id: 5, text: 'Понятно.', isSent: false, timestamp: new Date('2025-05-31T12:06:45') }, 
        { id: 6, text: 'Как успехи?', isSent: true, timestamp: new Date() },
      ]
    }
  },
  methods: {
    shouldShowTimestamp(currentTimestamp, prevTimestamp) {
      if (!prevTimestamp) {
        return true;
      }

      const current = new Date(currentTimestamp);
      const prev = new Date(prevTimestamp);

      if (current.toDateString() !== prev.toDateString()) {
        return true;
      }

      const diffMinutes = Math.abs(current.getTime() - prev.getTime()) / (1000 * 60);

      return diffMinutes >= 2 || current.getHours() !== prev.getHours();
    },

    formatTimestamp(timestamp) {
      const now = new Date();
      const messageDate = new Date(timestamp);

      const isToday = now.toDateString() === messageDate.toDateString();

      if (isToday) {
        return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      } else {
        const options = {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        };
        return messageDate.toLocaleDateString('ru-RU', options)
                            .replace(/\./g, '')
                            .replace(',', '') 
                            .trim(); 
      }
    },
    sendMessage() {
      if (this.message.trim() === '') {
        return; 
      }

      const newMessage = {
        id: this.messages.length + 1,
        text: this.message.trim(),
        isSent: true,
        timestamp: new Date(), 
      };

      this.messages.push(newMessage);
      this.message = '';
      this.$nextTick(() => {
        const messagesContainer = this.$el.querySelector('.messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
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
  font-family: 'Roboto', sans-serif;
}

.message-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}


.timestamp {
  color: #ffff;
  font-size: 0.75rem;
  margin-bottom: 5px;
  text-align: center;
  width: 100%;
  font-family: 'Roboto', sans-serif;
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
  background-color: #292F3F;
  padding-top: 10px;
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
