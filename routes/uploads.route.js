import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadImage, deleteImage } from '../controllers/uploads.controller.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

// Для __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function uploadsRoutes(fastify, options) {
  // Загрузка изображения (только админ)
  fastify.post('/', { preHandler: [authenticateToken, isAdmin] }, uploadImage);

  // Удаление изображения (только админ)
  fastify.delete('/:filename', { preHandler: [authenticateToken, isAdmin] }, deleteImage);
}
