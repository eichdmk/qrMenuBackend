import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Логин администратора
export const loginAdmin = async (request, reply) => {
  try {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.status(400).send({ message: 'Необходимо указать логин и пароль' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return reply.status(400).send({ message: 'Неверные данные' });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return reply.status(400).send({ message: 'Неверные данные' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return reply.send({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при авторизации' });
  }
};

// Проверка токена
export const verifyToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.status(401).send({ message: 'Нет токена' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Получаем актуальные данные пользователя из БД
    const userResult = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [decoded.id]);
    
    if (userResult.rows.length === 0) {
      return reply.status(401).send({ message: 'Пользователь не найден' });
    }

    return reply.send({ user: userResult.rows[0] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.status(401).send({ message: 'Токен истек' });
    }
    console.error(err);
    return reply.status(401).send({ message: 'Неверный токен' });
  }
};
