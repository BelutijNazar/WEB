export function validateLoginNickname(nickname) {
    if (!nickname || nickname.trim() === '') {
        return 'Логин не может быть пустым.';
    }
    if (nickname.length < 3) {
        return 'Логин должен быть не менее 3 символов.';
    }
    return ''; 
}

export function validateLoginPassword(password) {
    if (!password || password.trim() === '') {
        return 'Пароль не может быть пустым.';
    }
    return ''; 
}