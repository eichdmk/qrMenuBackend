import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
  createTable,
  getAllTables,
  getTablesWithAvailability,
  getTablesAvailabilityForDateTime,
  getTableById,
  getTableByToken,
  updateTable,
  updateTableStatus,
  deleteTable
} from '../controllers/tables.controller.js';

export default async function tablesRoutes(fastify, options) {
  // Получить все столики (только для админа)
  fastify.get('/', { preHandler: [authenticateToken, isAdmin] }, getAllTables);

  // Получить столики с информацией о доступности (публично для бронирования)
  fastify.get('/availability', getTablesWithAvailability);

  // Получить доступность столиков на конкретную дату и время (публично)
  fastify.get('/availability/date-time', getTablesAvailabilityForDateTime);

  // Получить столик по ID (админ)
  fastify.get('/id/:id', { preHandler: [authenticateToken, isAdmin] }, getTableById);

  // Получить столик по токену (для QR-кода, публичный)
  fastify.get('/:token', getTableByToken);

  // Добавить новый столик (админ)
  fastify.post('/', { preHandler: [authenticateToken, isAdmin] }, createTable);

  // Обновить столик (админ)
  fastify.put('/:id', { preHandler: [authenticateToken, isAdmin] }, updateTable);

  // Обновить только статус столика (админ)
  fastify.patch('/:id/status', { preHandler: [authenticateToken, isAdmin] }, updateTableStatus);

  // Удалить столик (админ)
  fastify.delete('/:id', { preHandler: [authenticateToken, isAdmin] }, deleteTable);
}
