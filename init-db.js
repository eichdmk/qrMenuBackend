import pool from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log('🔄 Инициализация базы данных...');
    
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Выполняем SQL скрипт
    await pool.query(sqlContent);
    
    console.log('✅ База данных успешно инициализирована!');
    console.log('📊 Добавлены тестовые данные:');
    console.log('   - 4 категории');
    console.log('   - 5 блюд с изображениями');
    console.log('   - 5 столиков');
    console.log('   - Админ пользователь (admin/admin123)');
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации базы данных:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();
