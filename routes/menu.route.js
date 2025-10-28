import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getAllMenuItems,
  getMenuItemsPaginated,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemById
} from '../controllers/menu.controller.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

// __dirname для ES-модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function menuRoutes(fastify, options) {
  // CRUD меню — только админ
  fastify.get('/', getAllMenuItems);
  fastify.get('/paginated', getMenuItemsPaginated);
  fastify.get('/:id', getMenuItemById);
  fastify.post('/', { 
    preHandler: [authenticateToken, isAdmin]
  }, createMenuItem);
  fastify.put('/:id', { 
    preHandler: [authenticateToken, isAdmin]
  }, updateMenuItem);
  fastify.delete('/:id', { preHandler: [authenticateToken, isAdmin] }, deleteMenuItem);
}
