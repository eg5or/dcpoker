import { FormEvent, useEffect, useState } from 'react';
import { EmojiPasswordInput } from './EmojiPasswordInput';

interface LoginFormProps {
  onLogin: (login: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  error: string | null;
}

export function LoginForm({ onLogin, onSwitchToRegister, error }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    login?: string;
    password?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Автоматически сбрасываем ошибку пароля, когда пользователь вводит ровно 3 эмодзи
  useEffect(() => {
    // Используем правильный подсчёт символов для эмодзи
    const emojiCount = [...password].length;
    
    if (emojiCount === 3 && formErrors?.password) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.password;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
  }, [password, formErrors]);
  
  const validateForm = (): boolean => {
    const errors: { login?: string; password?: string } = {};
    let isValid = true;
    
    if (!login.trim()) {
      errors.login = 'Логин обязателен';
      isValid = false;
    }
    
    // Используем правильный подсчёт для эмодзи
    const emojiCount = [...password].length;
    
    if (!password) {
      errors.password = 'Пароль обязателен';
      isValid = false;
    } else if (emojiCount !== 3) {
      errors.password = 'Пароль должен содержать ровно 3 эмодзи';
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
      await onLogin(login, password);
    } catch (err) {
      // Ошибки обрабатываются в родительском компоненте
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработчик изменения пароля с немедленным сбросом ошибки при вводе 3 эмодзи
  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    
    // Если была ошибка пароля и сейчас 3 эмодзи, сразу сбрасываем ошибку
    const emojiCount = [...newPassword].length;
    if (formErrors?.password && emojiCount === 3) {
      setFormErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors.password;
        return Object.keys(newErrors).length ? newErrors : null;
      });
    }
  };
  
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl form-container">
      <h1 className="text-2xl text-white mb-4">Вход</h1>
      
      {/* Контейнер для общей ошибки с фиксированной высотой */}
      <div className="error-container min-h-[50px] mb-4 relative">
        {error && (
          <div className="bg-red-500 text-white p-3 rounded animate-fadeIn">
            {error}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
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
          <div className="form-error-container">
            {formErrors?.login && (
              <p className="form-error-message">{formErrors.login}</p>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-white mb-1">Пароль (3 эмодзи)</label>
          <EmojiPasswordInput
            id="password"
            value={password}
            onChange={handlePasswordChange}
            maxLength={3}
            required
            error={!!formErrors?.password}
          />
          <div className="form-error-container">
            {formErrors?.password && (
              <p className="form-error-message">{formErrors.password}</p>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Вход...' : 'Войти'}
        </button>
        
        <div className="text-center text-gray-400">
          Нет аккаунта?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-400 hover:underline"
          >
            Зарегистрироваться
          </button>
        </div>
      </form>
    </div>
  );
} 