import { FormEvent } from 'react';
import { Socket } from 'socket.io-client';

interface LoginFormProps {
  name: string;
  setName: (name: string) => void;
  error: string | null;
  socket: Socket | null;
  onJoin: (e: FormEvent) => void;
}

export function LoginForm({ name, setName, error, onJoin }: LoginFormProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={onJoin} className="bg-gray-800 p-8 rounded-lg shadow-xl">
        <h1 className="text-2xl text-white mb-4">Войти в Scrum Poker</h1>
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Присоединиться
        </button>
      </form>
    </div>
  );
} 