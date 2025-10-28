// utils/initAdmin.js
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export const createDefaultAdmin = async () => {
  try {
    // Проверяем, существует ли уже админ с ролью 'admin'
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND role = $2',
      [DEFAULT_ADMIN_USERNAME, 'admin']
    );

    if (result.rows.length > 0) {
      console.log('✅ Админ уже существует');
      return;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    // Создаём админа
    await pool.query(
      `INSERT INTO users (username, password_hash, role) 
       VALUES ($1, $2, 'admin')`,
      [DEFAULT_ADMIN_USERNAME, hashedPassword]
    );

    console.log(`✅ Создан админ: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`);
  } catch (err) {
    console.error('❌ Ошибка при создании админа:', err);
  }
};