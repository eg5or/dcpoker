import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  error: string | null;
}

export function AuthPage({ onLogin, onRegister, error }: AuthPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const handleSwitchToRegister = () => {
    setIsLoginMode(false);
  };
  
  const handleSwitchToLogin = () => {
    setIsLoginMode(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      {isLoginMode ? (
        <LoginForm 
          onLogin={onLogin}
          onSwitchToRegister={handleSwitchToRegister}
          error={error}
        />
      ) : (
        <RegisterForm 
          onRegister={onRegister}
          onSwitchToLogin={handleSwitchToLogin}
          error={error}
        />
      )}
    </div>
  );
} 