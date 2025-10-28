import pool from '../db.js';

// Кеш для категорий (TTL: 10 минут)
let categoriesCache = {
  data: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000 // 10 минут
};

const getCategoriesWithCache = async () => {
  const now = Date.now();
  
  if (categoriesCache.data && (now - categoriesCache.timestamp) < categoriesCache.ttl) {
    return categoriesCache.data;
  }
  
  const result = await pool.query('SELECT * FROM categories ORDER BY id');
  
  categoriesCache.data = result.rows;
  categoriesCache.timestamp = now;
  
  return result.rows;
};

// Получить все категории
export const getAllCategories = async (request, reply) => {
  try {
    const categories = await getCategoriesWithCache();
    return reply.send(categories);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении категорий' });
  }
};

// Функция для инвалидации кеша
export const invalidateCategoriesCache = () => {
  categoriesCache.data = null;
  categoriesCache.timestamp = 0;
};

// Добавить новую категорию
export const createCategory = async (request, reply) => {
  try {
    const { name } = request.body;
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    
    // Инвалидируем кеш
    invalidateCategoriesCache();
    
    return reply.status(201).send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при добавлении категории' });
  }
};

// Обновить категорию
export const updateCategory = async (request, reply) => {
  try {
    const { id } = request.params;
    const { name } = request.body;
    const result = await pool.query(
      'UPDATE categories SET name=$1 WHERE id=$2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ message: 'Категория не найдена' });
    
    // Инвалидируем кеш
    invalidateCategoriesCache();
    
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении категории' });
  }
};

// Удалить категорию
export const deleteCategory = async (request, reply) => {
  try {
    const { id } = request.params;
    // Можно добавить проверку: есть ли блюда в категории
    const result = await pool.query('DELETE FROM categories WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return reply.status(404).send({ message: 'Категория не найдена' });
    
    // Инвалидируем кеш
    invalidateCategoriesCache();
    
    return reply.send({ message: 'Категория удалена' });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при удалении категории' });
  }
};
