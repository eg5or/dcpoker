import { FormEvent, useState } from 'react';

interface RegisterFormProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  error: string | null;
}

export function RegisterForm({ onRegister, onSwitchToLogin, error }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setFormError('Пароли не совпадают');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Пароль должен содержать не менее 6 символов');
      return;
    }
    
    try {
      await onRegister(name, email, password);
    } catch (err) {
      // Ошибки обрабатываются в родительском компоненте
    }
  };
  
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
      <h1 className="text-2xl text-white mb-4">Регистрация</h1>
      
      {(error || formError) && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error || formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-white mb-1">Имя</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-white mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ваш email"
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-white mb-1">Пароль</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-white mb-1">Подтвердите пароль</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Подтвердите пароль"
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4"
        >
          Зарегистрироваться
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