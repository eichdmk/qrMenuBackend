import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Middleware для проверки JWT токена
export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.status(401).send({ message: 'Нет токена, доступ запрещен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.status(403).send({ message: 'Неверный токен' });
  }
};

export const isAdmin = async (request, reply) => {
  if (request.user.role !== 'admin') {
    return reply.status(403).send({ message: 'Нет прав администратора' });
  }
};
