import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.controller.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

export default async function categoriesRoutes(fastify, options) {
  // CRUD категорий
  fastify.get('/', getAllCategories);
  fastify.post('/', { preHandler: [authenticateToken, isAdmin] }, createCategory);
  fastify.put('/:id', { preHandler: [authenticateToken, isAdmin] }, updateCategory);
  fastify.delete('/:id', { preHandler: [authenticateToken, isAdmin] }, deleteCategory);
}
