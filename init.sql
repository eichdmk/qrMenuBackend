-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', 
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Категории меню
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 3. Таблица блюд
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 4. Столики
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    seats INTEGER DEFAULT 4,
    is_occupied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Таблица бронирований
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', 
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Заказы
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
    reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
    order_type VARCHAR(50) NOT NULL DEFAULT 'dine_in',
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'new',
    total_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Позиции заказа
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    item_comment TEXT
);

-- 8. Функция проверки доступности столика (улучшенная)
CREATE OR REPLACE FUNCTION is_table_available(p_table_id INTEGER, p_start TIMESTAMP, p_end TIMESTAMP)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INT;
    table_occupied BOOLEAN;
    active_orders_count INT;
BEGIN
    -- Проверяем существование столика и его занятость
    SELECT is_occupied INTO table_occupied
    FROM tables 
    WHERE id = p_table_id;
    
    IF table_occupied IS NULL THEN
        RETURN FALSE; -- Столик не найден
    END IF;
    
    IF table_occupied THEN
        RETURN FALSE; -- Столик занят
    END IF;
    
    -- Проверяем активные заказы
    SELECT COUNT(*) INTO active_orders_count
    FROM orders 
    WHERE table_id = p_table_id 
      AND status NOT IN ('completed', 'cancelled');
    
    IF active_orders_count > 0 THEN
        RETURN FALSE; -- Есть активные заказы
    END IF;
    
    -- Проверяем конфликты с бронированиями
    SELECT COUNT(*) INTO conflict_count
    FROM reservations
    WHERE table_id = p_table_id
      AND status IN ('pending','confirmed')
      AND NOT (end_at <= p_start OR start_at >= p_end);
    
    IF conflict_count = 0 THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Тестовые данные
INSERT INTO categories (name) VALUES 
('Закуски'),
('Основные блюда'),
('Напитки'),
('Десерты');

INSERT INTO menu_items (category_id, name, description, price, image_url, available) VALUES 
(1, 'Брускетта с томатами', 'Свежие томаты на поджаренном хлебе с базиликом', 350, '/uploads/bruschetta-with-tomatoes-close-up.jpg', true),
(2, 'Стейк Рибай', 'Сочный стейк с овощами гриль', 1200, '/uploads/ribeye-steak-plated.jpg', true),
(2, 'Цезарь с курицей', 'Классический салат Цезарь с куриной грудкой', 450, '/uploads/caesar-salad-with-chicken.png', true),
(3, 'Домашний лимонад с мятой', 'Освежающий лимонад с мятой и льдом', 200, '/uploads/homemade-lemonade-with-mint.jpg', true),
(4, 'Тирамису', 'Классический итальянский десерт', 400, '/uploads/classic-tiramisu.png', true);

INSERT INTO tables (name, seats) VALUES 
('Столик 1', 4),
('Столик 2', 2),
('Столик 3', 6),
('Столик 4', 4),
('Столик 5', 2);

-- 10. Индексы для оптимизации производительности
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_reservation_id ON orders(reservation_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX idx_reservations_table_time ON reservations(table_id, start_at, end_at);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);
CREATE INDEX idx_tables_token ON tables(token);
