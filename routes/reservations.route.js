import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  updateReservationStatus,
  deleteReservation
} from '../controllers/reservations.controller.js';

export default async function reservationsRoutes(fastify, options) {
  // Получить все брони — админ
  fastify.get('/', { preHandler: [authenticateToken, isAdmin] }, getAllReservations);

  // Получить бронь по ID — админ
  fastify.get('/:id', { preHandler: [authenticateToken, isAdmin] }, getReservationById);

  // Создать бронь — клиент (публично)
  fastify.post('/', createReservation);

  // Обновить бронь — админ
  fastify.put('/:id', { preHandler: [authenticateToken, isAdmin] }, updateReservation);

  // Обновить только статус брони — админ
  fastify.patch('/:id/status', { preHandler: [authenticateToken, isAdmin] }, updateReservationStatus);

  // Удалить бронь — админ
  fastify.delete('/:id', { preHandler: [authenticateToken, isAdmin] }, deleteReservation);
}
