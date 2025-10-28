import pool from './db.js';

async function addTestData() {
  try {
    console.log('🔄 Добавление тестовых данных...');
    
    // Проверяем, есть ли уже данные
    const existingItems = await pool.query('SELECT COUNT(*) FROM menu_items');
    const count = parseInt(existingItems.rows[0].count);
    
    if (count > 0) {
      console.log(`📊 В базе уже есть ${count} блюд`);
      
      // Проверим, есть ли блюда с изображениями
      const itemsWithImages = await pool.query('SELECT COUNT(*) FROM menu_items WHERE image_url IS NOT NULL');
      const imagesCount = parseInt(itemsWithImages.rows[0].count);
      
      if (imagesCount === 0) {
        console.log('🖼️ Обновляем изображения для существующих блюд...');
        
        // Обновляем существующие блюда с изображениями
        await pool.query(`
          UPDATE menu_items 
          SET image_url = '/uploads/bruschetta-with-tomatoes-close-up.jpg'
          WHERE name = 'Пицца' AND image_url IS NULL
        `);
        
        console.log('✅ Изображения обновлены!');
      } else {
        console.log(`✅ Уже есть ${imagesCount} блюд с изображениями`);
      }
    } else {
      console.log('📊 Добавляем тестовые данные...');
      
      // Добавляем категории
      await pool.query(`
        INSERT INTO categories (name) VALUES 
        ('Закуски'),
        ('Основные блюда'),
        ('Напитки'),
        ('Десерты')
        ON CONFLICT DO NOTHING
      `);
      
      // Добавляем блюда
      await pool.query(`
        INSERT INTO menu_items (category_id, name, description, price, image_url, available) VALUES 
        (1, 'Брускетта с томатами', 'Свежие томаты на поджаренном хлебе с базиликом', 350, '/uploads/bruschetta-with-tomatoes-close-up.jpg', true),
        (2, 'Стейк Рибай', 'Сочный стейк с овощами гриль', 1200, '/uploads/ribeye-steak-plated.jpg', true),
        (2, 'Цезарь с курицей', 'Классический салат Цезарь с куриной грудкой', 450, '/uploads/caesar-salad-with-chicken.png', true),
        (3, 'Домашний лимонад с мятой', 'Освежающий лимонад с мятой и льдом', 200, '/uploads/homemade-lemonade-with-mint.jpg', true),
        (4, 'Тирамису', 'Классический итальянский десерт', 400, '/uploads/classic-tiramisu.png', true)
        ON CONFLICT DO NOTHING
      `);
      
      // Добавляем столики
      await pool.query(`
        INSERT INTO tables (name, seats) VALUES 
        ('Столик 1', 4),
        ('Столик 2', 2),
        ('Столик 3', 6),
        ('Столик 4', 4),
        ('Столик 5', 2)
        ON CONFLICT DO NOTHING
      `);
      
      console.log('✅ Тестовые данные добавлены!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении тестовых данных:', error);
  } finally {
    await pool.end();
  }
}

addTestData();
