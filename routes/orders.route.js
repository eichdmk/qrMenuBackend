import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  streamOrders
} from '../controllers/orders.controller.js';

export default async function ordersRoutes(fastify, options) {
  // Получить все заказы — админ
  fastify.get('/', { preHandler: [authenticateToken, isAdmin] }, getAllOrders);

  // Создать заказ — клиент
  fastify.post('/', createOrder);

  // Обновить статус заказа — админ
  fastify.put('/:id', { preHandler: [authenticateToken, isAdmin] }, updateOrderStatus);

  // SSE endpoint для уведомлений о новых заказах
  fastify.get('/stream', streamOrders);
}
