import { Request, Response } from 'express';
import { generateToken } from '../config/jwt';
import { User } from '../models/user.model';

// Регистрация нового пользователя
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password } = req.body;

    // Проверка, существует ли уже пользователь с таким email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Создание нового пользователя
    const user = await User.create({
      name,
      email,
      password
    });

    // Генерация JWT токена
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    return res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
  }
};

// Авторизация пользователя
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя по email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    // Генерация JWT токена
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Успешная авторизация',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    return res.status(500).json({ message: 'Ошибка при авторизации пользователя' });
  }
};

// Получение информации о текущем пользователе
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    // req.user добавляется через middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе:', error);
    return res.status(500).json({ message: 'Ошибка при получении информации о пользователе' });
  }
}; 