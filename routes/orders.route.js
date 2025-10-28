import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus
} from '../controllers/orders.controller.js';
import pool from '../db.js';

export default async function ordersRoutes(fastify, options) {
  // Получить все заказы — админ
  fastify.get('/', { preHandler: [authenticateToken, isAdmin] }, getAllOrders);

  // Создать заказ — клиент
  fastify.post('/', createOrder);

  // Обновить статус заказа — админ
  fastify.put('/:id', { preHandler: [authenticateToken, isAdmin] }, updateOrderStatus);

  // SSE endpoint для уведомлений о новых заказах
  let connectedClients = [];
  let latestOrderId = null;

  fastify.get('/stream', async (request, reply) => {
    // Настройка SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Получаем последний заказ при подключении
    try {
      const lastOrderResult = await pool.query(
        'SELECT id FROM orders ORDER BY created_at DESC LIMIT 1'
      );
      if (lastOrderResult.rows.length > 0) {
        latestOrderId = lastOrderResult.rows[0].id;
      }
    } catch (err) {
      console.error('Error getting last order:', err);
    }

    // Добавляем клиента
    const clientId = Date.now();
    const client = { id: clientId, response: reply.raw };
    connectedClients.push(client);

    // Отправляем начальное сообщение
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Проверяем новые заказы каждые 1 секунду для более быстрого отклика
    const checkInterval = setInterval(async () => {
      try {
        const result = await pool.query(
          'SELECT * FROM orders WHERE id > $1 ORDER BY created_at DESC',
          [latestOrderId || 0]
        );

        if (result.rows.length > 0) {
          const newOrders = result.rows;
          latestOrderId = newOrders[0].id;

          // Оптимизируем запросы - получаем все позиции одним запросом
          const orderIds = newOrders.map(o => o.id);
          const allItemsResult = await pool.query(
            `SELECT oi.order_id, oi.id, oi.quantity, oi.unit_price, oi.item_comment,
                    mi.name AS menu_item_name, mi.description AS menu_item_description
             FROM order_items oi
             LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE oi.order_id = ANY($1)
             ORDER BY oi.order_id, oi.id`,
            [orderIds]
          );

          // Группируем позиции по заказам
          const itemsByOrder = new Map();
          allItemsResult.rows.forEach(item => {
            if (!itemsByOrder.has(item.order_id)) {
              itemsByOrder.set(item.order_id, []);
            }
            itemsByOrder.get(item.order_id).push({
              id: item.id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              item_comment: item.item_comment,
              menu_item_name: item.menu_item_name,
              menu_item_description: item.menu_item_description
            });
          });

          // Создаем заказы с позициями
          const ordersWithItems = newOrders.map(order => ({
            ...order,
            items: itemsByOrder.get(order.id) || []
          }));

          // Отправляем уведомление всем подключенным клиентам
          const message = `data: ${JSON.stringify({ 
            type: 'new_order', 
            orders: ordersWithItems 
          })}\n\n`;

          // Удаляем отключенных клиентов перед отправкой
          connectedClients = connectedClients.filter(client => {
            try {
              client.response.write(message);
              return true;
            } catch (err) {
              return false;
            }
          });
        }
      } catch (err) {
        console.error('Error checking new orders:', err);
      }
    }, 1000); // Проверяем каждую секунду для более быстрого отклика

    // Обработка отключения клиента
    request.raw.on('close', () => {
      clearInterval(checkInterval);
      connectedClients = connectedClients.filter(c => c.id !== clientId);
      console.log(`Client ${clientId} disconnected. Active clients: ${connectedClients.length}`);
    });

    reply.raw.on('close', () => {
      clearInterval(checkInterval);
      connectedClients = connectedClients.filter(c => c.id !== clientId);
      console.log(`Client ${clientId} disconnected. Active clients: ${connectedClients.length}`);
    });
  });
}
