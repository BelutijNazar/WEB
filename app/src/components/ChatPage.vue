<template>
  <div class="chat-page">
    <div class="header">
      <h2>Чат с {{ selectedUser ? selectedUser.nickname : 'Выберите собеседника' }}</h2>
    </div>

    <div class="messages">
      <div v-for="(msg, index) in messages" :key="msg.id" class="message-group">
        <div
          v-if="shouldShowTimestamp(msg.timestamp, index > 0 ? messages[index - 1].timestamp : null)"
          class="timestamp"
        >
          {{ formatTimestamp(msg.timestamp) }}
        </div>
        <div :class="['message', msg.sender_id === userId ? 'message--sent' : 'message--received']"
             @click="msg.sender_id === userId && showContextMenu(msg, $event)"
             @contextmenu.prevent="msg.sender_id === userId && showContextMenu(msg, $event)">
          <template v-if="editingMessageId === msg.id">
            <input
              v-model="editingMessageText"
              @keyup.enter="saveEditedMessage"
              @keyup.esc="cancelEditing"
              v-focus
              class="edit-input"
            />
            <div class="edit-actions">
              <button @click="saveEditedMessage" class="save-button">Сохранить</button>
              <button @click="cancelEditing" class="cancel-button">Отмена</button>
            </div>
          </template>
          <template v-else>
            {{ msg.message }}
          </template>
        </div>

        <div v-if="contextMenu.visible && contextMenu.messageId === msg.id"
             :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
             class="message-context-menu">
          <div @click="startEditing(msg)">Редактировать</div>
          <div @click="deleteMessage(msg.id)">Удалить</div>
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

    <div v-if="!selectedUser" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #373E4E; padding: 20px; border-radius: 10px; color: white;">
      <h3>Выберите пользователя для чата:</h3>
      <ul>
        <li v-for="user in users" :key="user.id" @click="selectUser(user)" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #4A5469;">
          {{ user.nickname }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';

export default {
  name: 'ChatPage',
  data() {
    return {
      socket: null,
      message: '',
      messages: [],
      token: localStorage.getItem('chatToken') || '',
      userId: localStorage.getItem('chatUserId') || null,
      nickname: localStorage.getItem('chatNickname') || '',
      users: [],
      selectedUser: null,
      editingMessageId: null, // ID сообщения, которое редактируется
      editingMessageText: '', // Текст сообщения в поле редактирования
      contextMenu: { // Для отображения контекстного меню
        visible: false,
        messageId: null,
        x: 0,
        y: 0,
      }
    };
  },
  directives: {
    focus: { // Кастомная директива для автоматического фокуса на поле редактирования
      mounted(el) {
        el.focus();
      }
    }
  },
  created() {
    this.connectSocket();
    this.fetchUsers();
    // Добавляем обработчик для закрытия контекстного меню при клике в любом месте
    document.addEventListener('click', this.closeContextMenu);
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    // Удаляем обработчик при уничтожении компонента
    document.removeEventListener('click', this.closeContextMenu);
  },
  watch: {
    selectedUser(newVal, oldVal) {
      if (newVal && newVal.id !== (oldVal ? oldVal.id : null)) {
        this.fetchMessages(newVal.id);
        this.editingMessageId = null; // Сбрасываем редактирование при смене чата
        this.contextMenu.visible = false; // Скрываем меню
      }
    }
  },
  methods: {
    connectSocket() {
      this.socket = io('http://192.168.100.4:3000');

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        if (this.token) {
          this.socket.emit('authenticate', this.token);
        }
      });

      this.socket.on('authenticated', (data) => {
        console.log('Socket authenticated for user:', data.nickname);
        this.userId = data.userId;
        this.nickname = data.nickname;
      });

      this.socket.on('authentication_error', (data) => {
        console.error('Socket authentication error:', data.message);
        // this.$router.push('/login'); // Перенаправить на страницу входа
      });

      this.socket.on('receive_message', (newMessage) => {
        console.log('Получено сообщение:', newMessage);
        if (
            (newMessage.sender_id === this.userId && newMessage.receiver_id === this.selectedUser?.id) ||
            (newMessage.sender_id === this.selectedUser?.id && newMessage.receiver_id === this.userId)
        ) {
          this.messages.push(newMessage);
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      });

      this.socket.on('message_error', (error) => {
        console.error('Message error:', error.message);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // НОВЫЕ ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO ДЛЯ РЕДАКТИРОВАНИЯ/УДАЛЕНИЯ
      this.socket.on('message_updated', (updatedMsg) => {
        console.log('Сообщение обновлено через Socket.IO:', updatedMsg);
        // Находим сообщение в массиве и обновляем его
        const index = this.messages.findIndex(m => m.id === updatedMsg.id);
        if (index !== -1) {
          this.messages.splice(index, 1, updatedMsg); // Заменяем старое сообщение на обновленное
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      });

      this.socket.on('message_deleted', ({ messageId, senderId, receiverId }) => {
        console.log('Сообщение удалено через Socket.IO:', messageId);
        // Удаляем сообщение из массива только если оно относится к текущему чату
        if (
            (senderId === this.userId && receiverId === this.selectedUser?.id) ||
            (senderId === this.selectedUser?.id && receiverId === this.userId)
        ) {
          this.messages = this.messages.filter(m => m.id !== messageId);
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      });
    },

    async fetchUsers() {
      try {
        const response = await fetch('http://192.168.100.4:3000/api/users', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.users = await response.json();
          // ... (возможно, автоматический выбор первого пользователя)
        } else {
          console.error('Failed to fetch users:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },

    async fetchMessages(otherUserId) {
      if (!otherUserId) return;
      try {
        const response = await fetch(`http://192.168.100.4:3000/api/messages/${otherUserId}`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.messages = await response.json();
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else {
          console.error('Failed to fetch messages:', response.statusText);
          this.messages = [];
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        this.messages = [];
      }
    },

    sendMessage() {
      if (this.message.trim() === '' || !this.socket || !this.selectedUser) {
        return;
      }

      this.socket.emit('send_message', {
        receiverId: this.selectedUser.id,
        message: this.message.trim(),
      });

      this.message = '';
    },

    selectUser(user) {
      this.selectedUser = user;
      this.messages = [];
    },

    // --- НОВЫЕ МЕТОДЫ ДЛЯ РЕДАКТИРОВАНИЯ/УДАЛЕНИЯ ---

    showContextMenu(message, event) {
        // Убедитесь, что контекстное меню отображается только для ваших сообщений
        if (message.sender_id !== this.userId) return;

        this.contextMenu.messageId = message.id;
        this.contextMenu.x = event.clientX;
        this.contextMenu.y = event.clientY;
        this.contextMenu.visible = true;

        // Останавливаем всплытие события, чтобы preventDefault не был вызван для document
        event.stopPropagation();
    },
    closeContextMenu() {
        this.contextMenu.visible = false;
        this.contextMenu.messageId = null;
    },

    startEditing(message) {
      this.editingMessageId = message.id;
      this.editingMessageText = message.message;
      this.closeContextMenu(); // Закрываем контекстное меню
    },

    async saveEditedMessage() {
      if (this.editingMessageText.trim() === '') {
        alert('Сообщение не может быть пустым.');
        return;
      }

      try {
        const response = await fetch(`http://192.168.100.4:3000/api/messages/${this.editingMessageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ newMessageText: this.editingMessageText })
        });

        if (response.ok) {
          // Сообщение будет обновлено через Socket.IO событие 'message_updated'
          console.log('Сообщение успешно отредактировано на сервере.');
        } else {
          const errorData = await response.json();
          console.error('Ошибка при редактировании сообщения:', errorData.message);
          alert(`Ошибка: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Network error during message edit:', error);
        alert('Не удалось подключиться к серверу для редактирования сообщения.');
      } finally {
        this.cancelEditing(); // Всегда сбрасываем состояние редактирования
      }
    },

    cancelEditing() {
      this.editingMessageId = null;
      this.editingMessageText = '';
    },

    async deleteMessage(messageId) {
      if (!confirm('Вы уверены, что хотите удалить это сообщение?')) {
        return;
      }
      try {
        const response = await fetch(`http://192.168.100.4:3000/api/messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.ok) {
          // Сообщение будет удалено через Socket.IO событие 'message_deleted'
          console.log('Сообщение успешно удалено на сервере.');
        } else {
          const errorData = await response.json();
          console.error('Ошибка при удалении сообщения:', errorData.message);
          alert(`Ошибка: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Network error during message delete:', error);
        alert('Не удалось подключиться к серверу для удаления сообщения.');
      } finally {
        this.closeContextMenu(); // Закрываем контекстное меню
      }
    },

    // ... (существующие методы shouldShowTimestamp, formatTimestamp, scrollToBottom)
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
    scrollToBottom() {
        const messagesContainer = this.$el.querySelector('.messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
  }
};
</script>

<style scoped>
/* Ваши существующие стили */
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
  color: white;
  text-align: center;
  padding-top: 10px;
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
  position: relative; /* Добавлено для позиционирования контекстного меню */
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
  cursor: pointer; /* Добавлено для индикации кликабельности */
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

/* Стили для формы редактирования */
.edit-input {
    width: calc(100% - 70px); /* Учитываем кнопки */
    background-color: #4A5469;
    border: 1px solid #6c7a89;
    border-radius: 10px;
    padding: 8px 12px;
    color: white;
    font-size: 0.95rem;
    box-sizing: border-box;
    margin-right: 5px;
}

.edit-actions {
    display: flex;
    gap: 5px;
    margin-top: 5px; /* Или выровнять по центру с инпутом */
}

.save-button, .cancel-button {
    background-color: #4CAF50; /* Green for save */
    color: white;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 0.8rem;
}

.cancel-button {
    background-color: #f44336; /* Red for cancel */
}

/* Стили для контекстного меню */
.message-context-menu {
  position: fixed; /* Используем fixed для позиционирования относительно окна */
  background-color: #373E4E;
  border: 1px solid #4A5469;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000; /* Чтобы меню было поверх всего */
  padding: 5px 0;
}

.message-context-menu div {
  padding: 8px 15px;
  color: white;
  cursor: pointer;
  white-space: nowrap; /* Предотвращает перенос текста */
}

.message-context-menu div:hover {
  background-color: #4A5469;
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