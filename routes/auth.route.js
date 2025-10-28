import { loginAdmin, verifyToken } from '../controllers/auth.controller.js';

export default async function authRoutes(fastify, options) {
  // Логин администратора
  fastify.post('/login', loginAdmin);
  
  // Проверка токена
  fastify.get('/verify', verifyToken);
}
