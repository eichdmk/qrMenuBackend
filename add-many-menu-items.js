import pool from './db.js';

// Генератор разнообразных блюд
const menuItems = [
  // Закуски (категория 1)
  { name: 'Брускетта с томатами и базиликом', description: 'Свежие томаты на поджаренном хлебе с базиликом', price: 350, category: 1 },
  { name: 'Овощной салат', description: 'Свежие овощи с оливковым маслом', price: 280, category: 1 },
  { name: 'Сырная тарелка', description: 'Ассорти сыров с медом и орехами', price: 550, category: 1 },
  { name: 'Маринованные маслины', description: 'Средиземноморские оливки', price: 200, category: 1 },
  { name: 'Хумус с питой', description: 'Нутовое пюре с хлебом питой', price: 320, category: 1 },
  { name: 'Кальмары в кляре', description: 'Нежные кальмары в хрустящем кляре', price: 450, category: 1 },
  { name: 'Бутерброды с лососем', description: 'Лосось на черном хлебе с авокадо', price: 380, category: 1 },
  { name: 'Сырные палочки', description: 'Хрустящие палочки с сырным соусом', price: 280, category: 1 },
  { name: 'Тапас из ветчины', description: 'Испанская ветчина с хлебом', price: 420, category: 1 },
  { name: 'Грибы в сливочном соусе', description: 'Шампиньоны в белом соусе', price: 320, category: 1 },
  { name: 'Жареные креветки', description: 'Королевские креветки с чесноком', price: 580, category: 1 },
  { name: 'Сырные шарики', description: 'Моцарелла в панировке', price: 320, category: 1 },
  
  // Основные блюда (категория 2)
  { name: 'Стейк Рибай', description: 'Сочный стейк с овощами гриль', price: 1200, category: 2 },
  { name: 'Цезарь с курицей', description: 'Классический салат Цезарь с куриной грудкой', price: 450, category: 2 },
  { name: 'Карбонара', description: 'Спагетти с беконом и сливочным соусом', price: 550, category: 2 },
  { name: 'Паста с морепродуктами', description: 'Спагетти с креветками и мидиями', price: 720, category: 2 },
  { name: 'Куриная грудка на гриле', description: 'Нежная курица с рисом и овощами', price: 480, category: 2 },
  { name: 'Свиные ребрышки', description: 'Ребрышки в BBQ соусе', price: 680, category: 2 },
  { name: 'Лосось на гриле', description: 'Филе лосося с овощами', price: 750, category: 2 },
  { name: 'Борщ украинский', description: 'Традиционный борщ со сметаной', price: 350, category: 2 },
  { name: 'Пельмени классические', description: 'Домашние пельмени со сметаной', price: 380, category: 2 },
  { name: 'Лазанья', description: 'Итальянская лазанья с мясом', price: 650, category: 2 },
  { name: 'Пад Тай', description: 'Тайская лапша с креветками', price: 580, category: 2 },
  { name: 'Том Ям', description: 'Острый тайский суп с креветками', price: 450, category: 2 },
  { name: 'Шашлык из свинины', description: 'Шашлык на углях с соусами', price: 520, category: 2 },
  { name: 'Котлета по-киевски', description: 'Нежная курица с зеленым маслом', price: 480, category: 2 },
  { name: 'Ризотто с грибами', description: 'Кремовое ризотто с лесными грибами', price: 550, category: 2 },
  { name: 'Суши сет классический', description: '10 штук: роллы и нигири', price: 1200, category: 2 },
  { name: 'Рамен с курицей', description: 'Японский суп с лапшой и курицей', price: 480, category: 2 },
  { name: 'Бургер двойной', description: 'Двойная котлета с овощами', price: 550, category: 2 },
  { name: 'Пицца Маргарита', description: 'Классическая пицца с томатами', price: 580, category: 2 },
  { name: 'Пицца Четыре сезона', description: 'Пицца с разными начинками', price: 720, category: 2 },
  
  // Напитки (категория 3)
  { name: 'Домашний лимонад с мятой', description: 'Освежающий лимонад с мятой и льдом', price: 200, category: 3 },
  { name: 'Свежевыжатый апельсиновый сок', description: 'Натуральный сок апельсина', price: 180, category: 3 },
  { name: 'Домашний морс', description: 'Клюквенный морс', price: 150, category: 3 },
  { name: 'Кола', description: 'Охлажденная кола', price: 120, category: 3 },
  { name: 'Спрайт', description: 'Освежающий лимонад', price: 120, category: 3 },
  { name: 'Минеральная вода', description: 'Газированная минеральная вода', price: 100, category: 3 },
  { name: 'Чай черный', description: 'Горячий черный чай', price: 150, category: 3 },
  { name: 'Чай зеленый', description: 'Зеленый чай с лимоном', price: 150, category: 3 },
  { name: 'Кофе американо', description: 'Черный кофе', price: 180, category: 3 },
  { name: 'Капучино', description: 'Кофе с молочной пенкой', price: 220, category: 3 },
  { name: 'Латте', description: 'Нежный латте', price: 240, category: 3 },
  { name: 'Эспрессо', description: 'Крепкий эспрессо', price: 160, category: 3 },
  { name: 'Смузи клубничный', description: 'Клубничный смузи', price: 280, category: 3 },
  { name: 'Смузи банановый', description: 'Банановый смузи', price: 280, category: 3 },
  { name: 'Мохито безалкогольный', description: 'Освежающий мохито', price: 250, category: 3 },
  
  // Десерты (категория 4)
  { name: 'Тирамису', description: 'Классический итальянский десерт', price: 400, category: 4 },
  { name: 'Чизкейк классический', description: 'Нежный чизкейк с ягодами', price: 350, category: 4 },
  { name: 'Шоколадный торт', description: 'Торт с шоколадным кремом', price: 380, category: 4 },
  { name: 'Крем-брюле', description: 'Французский десерт с карамелью', price: 320, category: 4 },
  { name: 'Торт Медовик', description: 'Медовый торт со сметанным кремом', price: 350, category: 4 },
  { name: 'Брауни', description: 'Шоколадный брауни с мороженым', price: 280, category: 4 },
  { name: 'Панна кота', description: 'Итальянский молочный десерт', price: 300, category: 4 },
  { name: 'Профитроли', description: 'Маленькие пирожные с кремом', price: 320, category: 4 },
  { name: 'Наполеон', description: 'Торт Наполеон с заварным кремом', price: 350, category: 4 },
  { name: 'Варенье из крыжовника', description: 'Домашнее варенье с мороженым', price: 250, category: 4 },
  { name: 'Мороженое пломбир', description: 'Ванильное мороженое', price: 200, category: 4 },
  { name: 'Мороженое шоколадное', description: 'Шоколадное мороженое', price: 220, category: 4 },
  { name: 'Яблочный штрудель', description: 'Теплый штрудель с мороженым', price: 380, category: 4 },
  { name: 'Блины с вареньем', description: 'Домашние блины с вареньем', price: 280, category: 4 },
];

// Изображения (используем существующие)
const images = [
  '/uploads/bruschetta-with-tomatoes-close-up.jpg',
  '/uploads/caesar-salad-with-chicken.png',
  '/uploads/classic-carbonara.png',
  '/uploads/homemade-lemonade-with-mint.jpg',
  '/uploads/ribeye-steak-with-grilled-vegetables.jpg',
  '/uploads/tiramisu-slice.jpg',
  '/uploads/tomato-bruschetta.png',
  '/uploads/placeholder.jpg',
];

async function addManyMenuItems() {
  try {
    console.log('🔄 Добавление тестовых блюд...');
    
    // Получаем категории
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY id');
    const categories = {};
    
    // Создаем маппинг: название категории -> ID
    const categoryMap = {
      'Закуски': 'Закуски',
      'Основные блюда': 'Основные блюда',
      'Напитки': 'Напитки',
      'Десерты': 'Десерты'
    };
    
    categoriesResult.rows.forEach(cat => {
      categories[cat.id] = cat.name;
    });
    
    console.log('📊 Найдено категорий:', categoriesResult.rows.length);
    categoriesResult.rows.forEach(cat => {
      console.log(`  - ID: ${cat.id}, Название: ${cat.name}`);
    });
    
    let added = 0;
    let skipped = 0;
    
    for (const item of menuItems) {
      // Проверяем, есть ли уже такое блюдо
      const existing = await pool.query(
        'SELECT id FROM menu_items WHERE name = $1',
        [item.name]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Находим ID категории по названию
      const categoryId = categoriesResult.rows.find(
        c => c.name === ['Закуски', 'Основные блюда', 'Напитки', 'Десерты'][item.category - 1]
      );
      
      if (!categoryId) {
        console.log(`⚠️  Пропущено: ${item.name} - категория не найдена`);
        skipped++;
        continue;
      }
      
      // Случайное изображение для блюда
      const randomImage = images[Math.floor(Math.random() * images.length)];
      
      await pool.query(
        `INSERT INTO menu_items (category_id, name, description, price, image_url, available) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [categoryId.id, item.name, item.description, item.price, randomImage, true]
      );
      
      added++;
      console.log(`✅ Добавлено: ${item.name} (категория ID: ${categoryId.id})`);
    }
    
    // Получаем общее количество
    const countResult = await pool.query('SELECT COUNT(*) FROM menu_items');
    const total = parseInt(countResult.rows[0].count);
    
    console.log('\n📊 Результат:');
    console.log(`✅ Добавлено блюд: ${added}`);
    console.log(`⏭️  Пропущено (уже есть): ${skipped}`);
    console.log(`📝 Всего блюд в меню: ${total}`);
    
    // Инвалидируем кеш меню
    console.log('\n🔄 Кеш меню будет обновлен при следующем запросе');
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении блюд:', error);
  } finally {
    await pool.end();
  }
}

addManyMenuItems();

