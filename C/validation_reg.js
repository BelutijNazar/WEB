export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return 'Email не может быть пустым.';
    }
    if (!emailRegex.test(email)) {
        return 'Пожалуйста, введите корректный email.';
    }
    return ''; // Пустая строка означает отсутствие ошибки
}

export function validatePassword(password) {
    // Минимум 8 символов, хотя бы 1 цифровая, верхний и нижний регистр
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password) {
        return 'Пароль не может быть пустым.';
    }
    if (password.length < 8) {
        return 'Пароль должен содержать минимум 8 символов.';
    }
    if (!passwordRegex.test(password)) {
        return 'Пароль должен содержать хотя бы одну заглавную букву, одну строчную букву и одну цифру.';
    }
    return ''; // Пустая строка означает отсутствие ошибки
}

export function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword) {
        return 'Подтверждение пароля не может быть пустым.';
    }
    if (password !== confirmPassword) {
        return 'Пароли не совпадают.';
    }
    return ''; // Пустая строка означает отсутствие ошибки
}