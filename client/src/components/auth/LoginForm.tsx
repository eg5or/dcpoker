import { FormEvent, useState } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  error: string | null;
}

export function LoginForm({ onLogin, onSwitchToRegister, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onLogin(email, password);
    } catch (err) {
      // Ошибки обрабатываются в родительском компоненте
    }
  };
  
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
      <h1 className="text-2xl text-white mb-4">Вход в Scrum Poker</h1>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
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
        
        <div className="mb-6">
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
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4"
        >
          Войти
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