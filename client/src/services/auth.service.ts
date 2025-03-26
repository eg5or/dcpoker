interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  message: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

class AuthService {
  private baseUrl: string;
  private token: string | null = null;
  private user: UserData | null = null;

  constructor() {
    // Используем относительный путь для доступа к API через nginx proxy
    this.baseUrl = '/api';
    console.log('AuthService baseUrl:', this.baseUrl);
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token) {
        this.token = token;
      }
      
      if (userData) {
        this.user = JSON.parse(userData);
      }
    } catch (err) {
      console.error('Ошибка при загрузке данных из localStorage:', err);
      this.token = null;
      this.user = null;
    }
  }

  private saveToStorage() {
    if (this.token) {
      localStorage.setItem('token', this.token);
    } else {
      localStorage.removeItem('token');
    }
    
    if (this.user) {
      localStorage.setItem('user', JSON.stringify(this.user));
    } else {
      localStorage.removeItem('user');
    }
  }

  async login(email: string, password: string): Promise<UserData> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        // Проверяем формат ответа
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка при авторизации');
        } else {
          throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
        }
      }

      const data: AuthResponse = await response.json();
      this.token = data.token;
      this.user = data.user;
      this.saveToStorage();
      
      return data.user;
    } catch (err) {
      console.error('Ошибка при авторизации:', err);
      throw err;
    }
  }

  async register(name: string, email: string, password: string): Promise<UserData> {
    try {
      console.log('Отправка запроса на регистрацию:', `${this.baseUrl}/auth/register`);
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      console.log('Ответ сервера:', response.status, response.statusText);

      if (!response.ok) {
        // Проверяем формат ответа
        const contentType = response.headers.get('content-type');
        console.log('Content-Type ответа:', contentType);
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка при регистрации');
        } else {
          const errorText = await response.text();
          console.error('Текст ошибки:', errorText);
          throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
        }
      }

      const data: AuthResponse = await response.json();
      this.token = data.token;
      this.user = data.user;
      this.saveToStorage();
      
      return data.user;
    } catch (err) {
      console.error('Ошибка при регистрации:', err);
      throw err;
    }
  }

  logout(): void {
    console.log('Выполняется выход из сервиса аутентификации...');
    this.token = null;
    this.user = null;
    
    // Гарантированно очищаем localStorage
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (err) {
      console.error('Ошибка при очистке localStorage:', err);
    }
    
    this.saveToStorage();
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): UserData | null {
    return this.user;
  }

  async getProfile(): Promise<UserData> {
    if (!this.token) {
      throw new Error('Не авторизован');
    }

    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Сессия истекла');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка при получении профиля');
    }

    const data = await response.json();
    this.user = data.user;
    this.saveToStorage();
    
    return data.user;
  }
}

// Экспортируем экземпляр сервиса для использования во всем приложении
export const authService = new AuthService(); 