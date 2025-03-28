import { FormEvent, useEffect, useState } from 'react';
import { EmojiPasswordInput } from './EmojiPasswordInput';

interface RegisterFormProps {
  onRegister: (displayName: string, login: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  error: string | null;
}

export function RegisterForm({ onRegister, onSwitchToLogin, error }: RegisterFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    displayName?: string;
    login?: string;
    password?: string;
    confirmPassword?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Автоматически сбрасываем ошибки пароля при вводе корректных данных
  useEffect(() => {
    // Используем правильный подсчёт символов для эмодзи
    const passwordEmojiCount = [...password].length;
    
    // Если пароль теперь корректный, сбрасываем ошибку пароля
    if (password && passwordEmojiCount === 3 && formErrors?.password) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.password;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
    
    // Если пароли совпадают, сбрасываем ошибку подтверждения пароля
    if (password === confirmPassword && passwordEmojiCount > 0 && formErrors?.confirmPassword) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
  }, [password, confirmPassword, formErrors]);
  
  const validateForm = (): boolean => {
    const errors: {
      displayName?: string;
      login?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;
    
    if (!displayName.trim()) {
      errors.displayName = 'Отображаемое имя обязательно';
      isValid = false;
    }
    
    if (!login.trim()) {
      errors.login = 'Логин обязателен';
      isValid = false;
    }
    
    // Используем правильный подсчёт для эмодзи
    const passwordEmojiCount = [...password].length;
    
    if (!password) {
      errors.password = 'Пароль обязателен';
      isValid = false;
    } else if (passwordEmojiCount !== 3) {
      errors.password = 'Пароль должен содержать ровно 3 эмодзи';
      isValid = false;
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
      isValid = false;
    }
    
    setFormErrors(isValid ? null : errors);
    return isValid;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onRegister(displayName, login, password);
    } catch (err) {
      // Ошибки обрабатываются в родительском компоненте
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработчик изменения пароля
  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    
    // Если была ошибка пароля и сейчас 3 эмодзи, сразу сбрасываем ошибку
    if (formErrors?.password && [...newPassword].length === 3) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.password;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
    
    // Также проверяем совпадение с confirmPassword
    if (formErrors?.confirmPassword && newPassword === confirmPassword) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
  };
  
  // Обработчик изменения подтверждения пароля
  const handleConfirmPasswordChange = (newConfirmPassword: string) => {
    setConfirmPassword(newConfirmPassword);
    
    // Если была ошибка несовпадения паролей и сейчас они совпадают, сразу сбрасываем ошибку
    if (formErrors?.confirmPassword && password === newConfirmPassword) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
  };
  
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl form-container">
      <h1 className="text-2xl text-white mb-4">Регистрация</h1>
      
      {/* Контейнер для общей ошибки - теперь без фиксированной высоты */}
      {error && (
        <div className="bg-red-500 text-white p-3 rounded animate-fadeIn mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <label htmlFor="displayName" className="block text-white mb-1">Отображаемое имя</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ваше отображаемое имя"
            className={`w-full p-2 rounded bg-gray-700 text-white ${formErrors?.displayName ? 'border-2 border-red-500' : ''}`}
            required
          />
          {formErrors?.displayName && (
            <div className="form-error-container">
              <p className="form-error-message">{formErrors.displayName}</p>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="login" className="block text-white mb-1">Логин</label>
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Ваш логин"
            className={`w-full p-2 rounded bg-gray-700 text-white ${formErrors?.login ? 'border-2 border-red-500' : ''}`}
            required
          />
          {formErrors?.login && (
            <div className="form-error-container">
              <p className="form-error-message">{formErrors.login}</p>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-white mb-1">Пароль (3 эмодзи)</label>
          <EmojiPasswordInput
            id="password"
            value={password}
            onChange={handlePasswordChange}
            maxLength={3}
            required
            error={!!formErrors?.password}
          />
          {formErrors?.password && (
            <div className="form-error-container">
              <p className="form-error-message">{formErrors.password}</p>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-white mb-1">Подтвердите пароль</label>
          <EmojiPasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            maxLength={3}
            required
            error={!!formErrors?.confirmPassword}
          />
          {formErrors?.confirmPassword && (
            <div className="form-error-container">
              <p className="form-error-message">{formErrors.confirmPassword}</p>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        
        <div className="text-center text-gray-400">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:underline"
          >
            Войти
          </button>
        </div>
      </form>
    </div>
  );
} 