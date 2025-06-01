<template>
  <div class="chat-container">
    <div class="user-list-sidebar">
      <div class="sidebar-header">
        <h3>Chat Name</h3>
      </div>
      <div class="user-list">
        <div v-if="users.length === 0" class="loading-users">
          Загрузка пользователей...
        </div>
        <ul v-else>
          <li
            v-for="user in users"
            :key="user.id"
            @click="selectUser(user)"
            :class="{ 'selected-user': selectedUser && selectedUser.id === user.id }"
          >
            {{ user.nickname }} {{ user.id === userId ? '(Вы)' : '' }}
          </li>
        </ul>
      </div>
    </div>

    <div class="main-chat-area">
      <div class="chat-header">
        <h2>{{ selectedUser ? selectedUser.nickname : 'Выберите собеседника' }}</h2>
      </div>

      <div class="messages" ref="messagesContainer">
        <div v-if="!selectedUser" class="no-chat-selected">
          Пожалуйста, выберите собеседника, чтобы начать чат.
        </div>
        <template v-else>
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
        </template>
      </div>

      <div class="input-area">
        <div class="input-wrapper">
          <input
            v-model="message"
            type="text"
            placeholder="Type your message..."
            class="message-input"
            @keyup.enter="sendMessage"
            :disabled="!selectedUser"
          />
          <button class="send-button" @click="sendMessage" :disabled="!selectedUser"></button>
        </div>
      </div>
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
    // Проверяем наличие токена и userId
    if (!this.token || !this.userId) {
      console.warn('Токен или ID пользователя отсутствуют. Перенаправление на страницу входа.');
      this.$router.push('/log'); // Перенаправить на страницу входа
      return; // Останавливаем выполнение, если нет токена/userId
    }

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
      this.socket = io('http://192.168.100.2:3000'); // Используем актуальный IP

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
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatUserId');
        localStorage.removeItem('chatNickname');
        alert('Ошибка аутентификации. Пожалуйста, войдите снова.');
        this.$router.push('/log');
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
        alert(`Ошибка сообщения: ${error.message}`);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('message_updated', (updatedMsg) => {
        console.log('Сообщение обновлено через Socket.IO:', updatedMsg);
        const index = this.messages.findIndex(m => m.id === updatedMsg.id);
        if (index !== -1) {
          if (
              (updatedMsg.sender_id === this.userId && updatedMsg.receiver_id === this.selectedUser?.id) ||
              (updatedMsg.sender_id === this.selectedUser?.id && updatedMsg.receiver_id === this.userId)
          ) {
              this.messages.splice(index, 1, updatedMsg);
              this.$nextTick(() => {
                  this.scrollToBottom();
              });
          }
        }
      });

      this.socket.on('message_deleted', ({ messageId, senderId, receiverId }) => {
        console.log('Сообщение удалено через Socket.IO:', messageId);
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
        const response = await fetch('http://192.168.100.2:3000/api/users', { // Используем актуальный IP
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          let fetchedUsers = await response.json();
          this.users = fetchedUsers.filter(user => user.id !== this.userId);
          if (this.users.length > 0 && !this.selectedUser) {
              this.selectUser(this.users[0]); // Автоматический выбор первого пользователя
          }
        } else if (response.status === 401) {
            console.error('Неавторизованный доступ к пользователям. Перенаправление на вход.');
            localStorage.removeItem('chatToken');
            localStorage.removeItem('chatUserId');
            localStorage.removeItem('chatNickname');
            this.$router.push('/log');
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
        const response = await fetch(`http://192.168.100.2:3000/api/messages/${otherUserId}`, { // Используем актуальный IP
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.messages = await response.json();
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else if (response.status === 401) {
            console.error('Неавторизованный доступ к сообщениям. Перенаправление на вход.');
            localStorage.removeItem('chatToken');
            localStorage.removeItem('chatUserId');
            localStorage.removeItem('chatNickname');
            this.$router.push('/log');
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

    showContextMenu(message, event) {
        if (message.sender_id !== this.userId) return;

        this.contextMenu.messageId = message.id;
        this.contextMenu.x = event.clientX;
        this.contextMenu.y = event.clientY;
        this.contextMenu.visible = true;

        event.stopPropagation();
    },
    closeContextMenu() {
        this.contextMenu.visible = false;
        this.contextMenu.messageId = null;
    },

    startEditing(message) {
      this.editingMessageId = message.id;
      this.editingMessageText = message.message;
      this.closeContextMenu();
    },

    async saveEditedMessage() {
      if (this.editingMessageText.trim() === '') {
        alert('Сообщение не может быть пустым.');
        return;
      }
      if (!this.editingMessageId) {
          console.error('Не выбран ID сообщения для редактирования.');
          return;
      }

      try {
        const response = await fetch(`http://192.168.100.2:3000/api/messages/${this.editingMessageId}`, { // Используем актуальный IP
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ newMessageText: this.editingMessageText })
        });

        if (response.ok) {
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
        this.cancelEditing();
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
      if (!messageId) {
          console.error('Не выбран ID сообщения для удаления.');
          return;
      }

      try {
        const response = await fetch(`http://192.168.100.2:3000/api/messages/${messageId}`, { // Используем актуальный IP
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.ok) {
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
        this.closeContextMenu();
      }
    },

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
        const messagesContainer = this.$refs.messagesContainer;
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

/* Основной контейнер чата */
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #4A5469;
  font-family: 'Roboto', sans-serif;
  overflow: hidden; /* Предотвращает прокрутку всего окна */
}

/* Левая панель - список пользователей */
.user-list-sidebar {
  width: 250px; /* Фиксированная ширина */
  background-color: #4A5469;
  border-right: 1px solid #4A5469;
  display: flex;
  flex-direction: column;
  color: white;
  overflow-y: auto; /* Прокрутка списка пользователей */
  padding-bottom: 20px; /* Отступ снизу */
}

.sidebar-header {
  padding: 10.8px;
  background-color: #4A5469;
  text-align: left;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  background-color: #4A5469;
  color: white; /* Цвет "Chat Name" */
}

.user-list {
  flex-grow: 1; /* Занимает все доступное пространство */
  padding: 10px 0;
}

.user-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.user-list li {
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-list li:hover {
  background-color: #4A5469;
}

.user-list li.selected-user {
  background-color: #5A657D; /* Цвет выбранного пользователя */
  font-weight: bold;
}

.loading-users {
    padding: 20px;
    text-align: center;
    color: #ccc;
}

/* Основная область чата */
.main-chat-area {
  flex-grow: 1; /* Занимает все оставшееся пространство */
  display: flex;
  flex-direction: column;
  background-color: #292F3F;
  position: relative; /* Для правильного позиционирования input-area */
}

.chat-header {
  height: 45px;
  width: 100%;
  background-color: #373E4E;
  color: white;
  text-align: center;
  padding-top: 10px;
  box-sizing: border-box; /* Включает padding в высоту */
}

.chat-header h2 {
  margin: 0;
  background-color: #373e4e;
  font-size: 1.3rem;
  line-height: 1; /* Выравнивание по центру */
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 20px;
  box-sizing: border-box;
  font-family: 'Roboto', sans-serif;
}

.no-chat-selected {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #aaa;
    font-size: 1.2rem;
    text-align: center;
}


.message-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
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
  cursor: pointer;
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

.edit-input {
    width: calc(100% - 70px);
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
    margin-top: 5px;
}

.save-button, .cancel-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 0.8rem;
}

.cancel-button {
    background-color: #f44336;
}

.message-context-menu {
  position: absolute; /* Changed from fixed to absolute, positioned relative to .message-group */
  background-color: #373E4E;
  border: 1px solid #4A5469;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  padding: 5px 0;
  /* Для того, чтобы меню появлялось рядом с сообщением, а не в верхнем левом углу страницы */
  transform: translateX(10px); /* Небольшой сдвиг от сообщения */
}

/* Если меню появляется слишком далеко, можно добавить: */
.message--sent + .message-context-menu {
  right: 0; /* Выравнивает меню по правому краю для отправленных сообщений */
  transform: translateX(-10px); /* Сдвигает влево */
}

.message-context-menu div {
  padding: 8px 15px;
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.message-context-menu div:hover {
  background-color: #4A5469;
}

.input-area {
  position: absolute; /* Изменено с fixed на absolute */
  bottom: 20px;
  left: 20px; /* Отступ от левого края main-chat-area */
  right: 20px; /* Отступ от правого края main-chat-area */
  width: auto; /* Ширина определяется left/right */
  max-width: none; /* Убираем max-width, т.к. ширина уже задана */
  box-sizing: border-box;
  background-color: #292F3F;
  padding-top: 10px;
  z-index: 10; /* Чтобы быть поверх сообщений */
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
  background-image: url('@/assets/speech-bubble.svg'); /* Убедитесь, что этот путь верен */
  background-repeat: no-repeat;
  background-position: center;
  background-size: 20px 20px;
}

@media (max-width: 768px) {
  .chat-container {
    flex-direction: column; /* На маленьких экранах делаем колонку */
  }

  .user-list-sidebar {
    width: 100%;
    height: 150px; /* Ограничиваем высоту на мобильных */
    border-right: none;
    border-bottom: 1px solid #4A5469;
  }

  .user-list {
    display: flex; /* Делаем список пользователей горизонтальным прокручиваемым */
    overflow-x: auto;
    white-space: nowrap; /* Запрещаем перенос строк */
  }

  .user-list ul {
    display: flex; /* Делаем элементы списка flex */
    gap: 5px; /* Небольшой отступ между элементами */
  }

  .user-list li {
    flex-shrink: 0; /* Не сжимаем элементы */
    border-bottom: none;
    border-right: 1px solid #373E4E; /* Добавляем разделитель между пользователями */
  }

  .main-chat-area {
    width: 100%; /* Занимает всю ширину */
    flex-grow: 1; /* Занимает оставшуюся высоту */
  }

  .messages {
    padding-bottom: 80px; /* Корректируем отступ для инпута */
  }

  .input-area {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }
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

  .user-list li {
    padding: 8px 12px;
  }
}
</style>