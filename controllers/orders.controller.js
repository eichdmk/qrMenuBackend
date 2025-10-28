import pool from '../db.js';

// Получить все заказы — админ (оптимизировано: N+1 исправлено) с пагинацией
export const getAllOrders = async (request, reply) => {
  try {
    // Получаем параметры пагинации из query string
    const limit = parseInt(request.query.limit) || 12;
    const offset = parseInt(request.query.offset) || 0;

    // Получаем заказы с позициями с учетом пагинации
    const result = await pool.query(
      `SELECT 
        o.id, o.table_id, o.reservation_id, o.order_type, o.customer_name, 
        o.customer_phone, o.comment, o.status, o.total_amount, o.created_at,
        t.name AS table_name,
        r.customer_name AS reservation_customer,
        oi.id AS item_id, oi.quantity AS item_quantity, oi.unit_price AS item_unit_price, 
        oi.item_comment AS item_comment,
        mi.name AS menu_item_name, mi.description AS menu_item_description
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       LEFT JOIN reservations r ON o.reservation_id = r.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE o.id IN (
         SELECT id FROM orders 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2
       )
       ORDER BY o.created_at DESC, oi.id`,
      [limit, offset]
    );

    // Также получаем общее количество заказов
    const countResult = await pool.query('SELECT COUNT(*) as total FROM orders');
    const total = parseInt(countResult.rows[0].total);

    // Группируем позиции по заказам
    const ordersMap = new Map();
    
    result.rows.forEach(row => {
      const orderId = row.id;
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: row.id,
          table_id: row.table_id,
          reservation_id: row.reservation_id,
          order_type: row.order_type,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          comment: row.comment,
          status: row.status,
          total_amount: row.total_amount,
          created_at: row.created_at,
          table_name: row.table_name,
          reservation_customer: row.reservation_customer,
          items: []
        });
      }

      // Добавляем позицию, если есть
      if (row.item_id) {
        ordersMap.get(orderId).items.push({
          id: row.item_id,
          quantity: row.item_quantity,
          unit_price: row.item_unit_price,
          item_comment: row.item_comment,
          menu_item_name: row.menu_item_name,
          menu_item_description: row.menu_item_description
        });
      }
    });

    const orders = Array.from(ordersMap.values());
    
    // Возвращаем данные с метаинформацией о пагинации
    return reply.send({
      orders,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + orders.length < total
      }
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении заказов' });
  }
};

// Создать заказ (клиент)
export const createOrder = async (request, reply) => {
  try {
    const { table_id, reservation_id, order_type, customer_name, customer_phone, comment, items } = request.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({ message: 'Необходимо указать позиции заказа' });
    }

    // Считаем общую сумму
    let total_amount = 0;
    for (const item of items) {
      total_amount += item.unit_price * item.quantity;
    }

    // Создаем заказ
    const orderResult = await pool.query(
      `INSERT INTO orders (table_id, reservation_id, order_type, customer_name, customer_phone, comment, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [table_id || null, reservation_id || null, order_type, customer_name, customer_phone, comment, total_amount]
    );

    const order = orderResult.rows[0];

    // Добавляем позиции заказа
    const insertPromises = items.map(item =>
      pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, item_comment)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.menu_item_id, item.quantity, item.unit_price, item.item_comment || null]
      )
    );
    await Promise.all(insertPromises);

    return reply.status(201).send({ order_id: order.id, message: 'Заказ успешно создан' });
  } catch (err) {
    console.error('Error creating order:', err);
    return reply.status(500).send({ message: 'Ошибка при создании заказа' });
  }
};

export const updateOrderStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    // Если статус меняется на 'completed', устанавливаем время завершения
    if (status === 'completed') {
      await pool.query(
        `UPDATE orders SET status = $1, completed_at = NOW() WHERE id = $2`,
        [status, id]
      );
    } else {
      await pool.query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        [status, id]
      );
    }

    const orderResult = await pool.query(
      `SELECT o.*, t.name AS table_name
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return reply.status(404).send({ message: 'Заказ не найден' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.*, m.name AS menu_item_name
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = $1`,
      [id]
    );

    const fullOrder = {
      ...order,
      items: itemsResult.rows
    };

    return reply.send(fullOrder);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении статуса заказа' });
  }
};