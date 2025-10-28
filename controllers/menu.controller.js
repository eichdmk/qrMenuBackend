import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Для __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

// Кеш для меню (TTL: 5 минут)
let menuCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 минут
};

const getMenuItemsWithCache = async () => {
  const now = Date.now();
  
  // Проверяем, нужно ли обновить кеш
  if (menuCache.data && (now - menuCache.timestamp) < menuCache.ttl) {
    return menuCache.data;
  }
  
  // Загружаем данные из БД
  const result = await pool.query(
    `SELECT m.id, m.category_id, c.name AS category_name, m.name, m.description, m.price, m.image_url, m.available
     FROM menu_items m
     LEFT JOIN categories c ON m.category_id = c.id
     ORDER BY m.id DESC`
  );
  
  // Обновляем кеш
  menuCache.data = result.rows;
  menuCache.timestamp = now;
  
  return result.rows;
};

// Получить меню с пагинацией
export const getMenuItemsPaginated = async (request, reply) => {
  try {
    const { page = 1, limit = 20, category_id } = request.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let queryParams = [limit, offset];
    
    if (category_id) {
      whereClause = 'WHERE m.category_id = $3';
      queryParams = [limit, offset, category_id];
    }
    
    const query = `
      SELECT m.id, m.category_id, c.name AS category_name, m.name, m.description, m.price, m.image_url, m.available
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      ${whereClause}
      ORDER BY m.id DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = category_id 
      ? 'SELECT COUNT(*) FROM menu_items WHERE category_id = $1'
      : 'SELECT COUNT(*) FROM menu_items';
    
    const countParams = category_id ? [category_id] : [];
    
    const [result, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    const itemsReturned = result.rows.length;
    
    return reply.send({
      items: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: (offset + itemsReturned) < total
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении меню' });
  }
};

// Получить все блюда (для обратной совместимости)
export const getAllMenuItems = async (request, reply) => {
  try {
    const items = await getMenuItemsWithCache();
    return reply.send(items);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении меню' });
  }
};

// Функция для инвалидации кеша
export const invalidateMenuCache = () => {
  menuCache.data = null;
  menuCache.timestamp = 0;
};

// Получить блюдо по ID
export const getMenuItemById = async (request, reply) => {
  try {
    const { id } = request.params;

    const result = await pool.query(
      `SELECT m.id, m.category_id, c.name AS category_name, m.name, m.description, m.price, m.image_url, m.available
       FROM menu_items m
       LEFT JOIN categories c ON m.category_id = c.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ message: 'Блюдо не найдено' });
    }

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении блюда' });
  }
};

// Добавить новое блюдо
export const createMenuItem = async (request, reply) => {
  try {
    let image_url = null;
    let category_id, name, description, price, available;

    // Проверяем, является ли запрос multipart
    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Если это multipart запрос
      const data = await request.file();
      const body = request.body;
      
      category_id = body.category_id;
      name = body.name;
      description = body.description;
      price = body.price;
      available = body.available;

      if (data) {
        const filename = `${Date.now()}-${data.filename}`;
        const filepath = path.join(uploadDir, filename);
        const writeStream = fs.createWriteStream(filepath);
        await data.file.pipeTo(writeStream);
        image_url = `/uploads/${filename}`;
      }
    } else {
      // Если это обычный JSON запрос
      const body = request.body;
      category_id = body.category_id;
      name = body.name;
      description = body.description;
      price = body.price;
      available = body.available;
      image_url = body.image_url || null;
    }

    const result = await pool.query(
      `INSERT INTO menu_items (category_id, name, description, price, image_url, available)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [category_id || null, name, description, price, image_url, available ?? true]
    );

    // Инвалидируем кеш
    invalidateMenuCache();

    return reply.status(201).send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при добавлении блюда' });
  }
};

// Обновить блюдо
export const updateMenuItem = async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Получаем текущее блюдо
    const current = await pool.query(`SELECT * FROM menu_items WHERE id=$1`, [id]);
    if (current.rows.length === 0) return reply.status(404).send({ message: 'Блюдо не найдено' });

    let image_url = current.rows[0].image_url;
    let category_id, name, description, price, available;

    // Проверяем, является ли запрос multipart
    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Если это multipart запрос
      const data = await request.file();
      const body = request.body;
      
      category_id = body.category_id;
      name = body.name;
      description = body.description;
      price = body.price;
      available = body.available;

      // Если загружен новый файл, заменяем
      if (data) {
        // Удаляем старое изображение
        if (image_url) {
          const oldPath = path.join(__dirname, '../', image_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const filename = `${Date.now()}-${data.filename}`;
        const filepath = path.join(uploadDir, filename);
        const writeStream = fs.createWriteStream(filepath);
        await data.file.pipeTo(writeStream);
        image_url = `/uploads/${filename}`;
      }
    } else {
      // Если это обычный JSON запрос
      const body = request.body;
      category_id = body.category_id;
      name = body.name;
      description = body.description;
      price = body.price;
      available = body.available;
      
      // Если передано новое изображение в JSON, используем его
      if (body.image_url !== undefined) {
        image_url = body.image_url;
      }
    }

    const result = await pool.query(
      `UPDATE menu_items SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5, available=$6
       WHERE id=$7 RETURNING *`,
      [category_id || null, name, description, price, image_url, available ?? true, id]
    );

    // Инвалидируем кеш
    invalidateMenuCache();

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении блюда' });
  }
};

// Удалить блюдо
// Удалить блюдо
export const deleteMenuItem = async (request, reply) => {
  try {
    const { id } = request.params;

    // Проверяем, есть ли заказы с этим блюдом
    const orderCheck = await pool.query(
      'SELECT 1 FROM order_items WHERE menu_item_id = $1 LIMIT 1',
      [id]
    );

    if (orderCheck.rows.length > 0) {
      return reply.status(400).send({
        message: 'Нельзя удалить блюдо, так как оно используется в заказах.'
      });
    }

    // Получаем текущее блюдо
    const current = await pool.query(`SELECT * FROM menu_items WHERE id=$1`, [id]);
    if (current.rows.length === 0) {
      return reply.status(404).send({ message: 'Блюдо не найдено' });
    }

    // Удаляем изображение, если есть
    const image_url = current.rows[0].image_url;
    if (image_url) {
      const imgPath = path.join(__dirname, '../', image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await pool.query(`DELETE FROM menu_items WHERE id=$1`, [id]);
    invalidateMenuCache();
    
    return reply.send({ message: 'Блюдо удалено' });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при удалении блюда' });
  }
};