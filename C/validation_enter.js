// D:\Git\WEB\WEB\C\validation_enter.js

export function validateLoginNickname(nickname) {
    if (!nickname || nickname.trim() === '') {
        return 'Логин не может быть пустым.';
    }
    // Здесь можно добавить другие правила для логина, например, минимальную длину
    if (nickname.length < 3) {
        return 'Логин должен быть не менее 3 символов.';
    }
    return ''; // Возвращаем пустую строку, если валидация успешна
}

export function validateLoginPassword(password) {
    if (!password || password.trim() === '') {
        return 'Пароль не может быть пустым.';
    }
    // Для входа обычно достаточно простой проверки на пустоту,
    // но если хотите строгие правила, как на регистрации, добавьте их здесь.
    // Например, если хотите требовать минимальную длину:
    // if (password.length < 6) {
    //     return 'Пароль должен быть не менее 6 символов.';
    // }
    return ''; // Возвращаем пустую строку, если валидация успешна
}