import pool from '../db.js';

// Получить все брони (только админ)
export const getAllReservations = async (request, reply) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.table_id, t.name AS table_name, r.customer_name, r.customer_phone, 
              r.start_at, r.end_at, r.status, r.created_at
       FROM reservations r
       JOIN tables t ON r.table_id = t.id
       ORDER BY r.start_at DESC`
    );
    return reply.send(result.rows);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении бронирований' });
  }
};

// Создать новую бронь (клиент)
export const createReservation = async (request, reply) => {
  try {
    const { table_id, customer_name, customer_phone, start_at, end_at } = request.body;

    const tableCheck = await pool.query(
      `SELECT id, name FROM tables WHERE id=$1`,
      [table_id]
    );

    if (tableCheck.rows.length === 0) {
      return reply.status(404).send({ message: 'Столик не найден' });
    }

    // Проверяем конфликты с другими бронированиями на выбранное время
    const reservationConflicts = await pool.query(
      `SELECT COUNT(*) AS conflict_count
       FROM reservations
       WHERE table_id=$1
         AND status IN ('pending', 'confirmed')
         AND NOT (end_at <= $2::timestamptz OR start_at >= $3::timestamptz)`,
      [table_id, start_at, end_at]
    );

    if (parseInt(reservationConflicts.rows[0].conflict_count) > 0) {
      return reply.status(400).send({ message: 'Столик уже забронирован в это время' });
    }

    // Проверяем активные заказы, которые могут пересекаться с временем бронирования
    // Правило: между созданием активного заказа и бронированием должно пройти минимум 2 часа
    const reservationDate = new Date(start_at);
    const twoHoursBeforeStart = new Date(reservationDate.getTime() - 2 * 60 * 60 * 1000);
    
    const activeOrders = await pool.query(
      `SELECT COUNT(*) AS orders_count
       FROM orders
       WHERE table_id=$1
         AND status NOT IN ('completed', 'cancelled')
         AND created_at >= $2::timestamptz
         AND DATE(created_at) >= DATE($3::timestamptz)`,
      [table_id, twoHoursBeforeStart.toISOString(), reservationDate.toISOString()]
    );

    if (parseInt(activeOrders.rows[0].orders_count) > 0) {
      return reply.status(400).send({ message: 'На столике есть активные заказы в это время' });
    }

    const result = await pool.query(
      `INSERT INTO reservations (table_id, customer_name, customer_phone, start_at, end_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [table_id, customer_name, customer_phone, start_at, end_at]
    );

    return reply.status(201).send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при создании брони' });
  }
};

// Получить бронь по ID (админ)
export const getReservationById = async (request, reply) => {
  try {
    const { id } = request.params;
    const result = await pool.query(
      `SELECT r.id, r.table_id, t.name AS table_name, r.customer_name, r.customer_phone, 
              r.start_at, r.end_at, r.status, r.created_at
       FROM reservations r
       JOIN tables t ON r.table_id = t.id
       WHERE r.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ message: 'Бронь не найдена' });
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении брони' });
  }
};

// Обновить бронь (админ)
export const updateReservation = async (request, reply) => {
  try {
    const { id } = request.params;
    const { table_id, customer_name, customer_phone, start_at, end_at, status } = request.body;

    const tableCheck = await pool.query(
      `SELECT id, name FROM tables WHERE id=$1`,
      [table_id]
    );

    if (tableCheck.rows.length === 0) {
      return reply.status(404).send({ message: 'Столик не найден' });
    }

    const currentReservation = await pool.query(
      `SELECT table_id FROM reservations WHERE id=$1`,
      [id]
    );

    if (currentReservation.rows.length === 0) {
      return reply.status(404).send({ message: 'Бронь не найдена' });
    }

    // Проверяем конфликты с другими бронированиями на выбранное время
    const reservationConflicts = await pool.query(
      `SELECT COUNT(*) AS conflict_count
       FROM reservations
       WHERE table_id=$1
         AND id != $2
         AND status IN ('pending', 'confirmed')
         AND NOT (end_at <= $3::timestamptz OR start_at >= $4::timestamptz)`,
      [table_id, id, start_at, end_at]
    );

    if (parseInt(reservationConflicts.rows[0].conflict_count) > 0) {
      return reply.status(400).send({ message: 'Столик уже забронирован в это время' });
    }

    // Проверяем активные заказы, которые могут пересекаться с временем бронирования
    // Правило: между созданием активного заказа и бронированием должно пройти минимум 2 часа
    const reservationDate = new Date(start_at);
    const twoHoursBeforeStart = new Date(reservationDate.getTime() - 2 * 60 * 60 * 1000);
    
    const activeOrders = await pool.query(
      `SELECT COUNT(*) AS orders_count
       FROM orders
       WHERE table_id=$1
         AND status NOT IN ('completed', 'cancelled')
         AND created_at >= $2::timestamptz
         AND DATE(created_at) >= DATE($3::timestamptz)`,
      [table_id, twoHoursBeforeStart.toISOString(), reservationDate.toISOString()]
    );

    if (parseInt(activeOrders.rows[0].orders_count) > 0) {
      return reply.status(400).send({ message: 'На столике есть активные заказы в это время' });
    }

    const result = await pool.query(
      `UPDATE reservations SET table_id=$1, customer_name=$2, customer_phone=$3, 
              start_at=$4, end_at=$5, status=$6 WHERE id=$7 RETURNING *`,
      [table_id, customer_name, customer_phone, start_at, end_at, status, id]
    );

    if (result.rows.length === 0) return reply.status(404).send({ message: 'Бронь не найдена' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении брони' });
  }
};

// Удалить бронь (админ)
export const deleteReservation = async (request, reply) => {
  try {
    const { id } = request.params;

    const ordersResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE reservation_id=$1`,
      [id]
    );

    if (parseInt(ordersResult.rows[0].count) > 0) {
      return reply.status(400).send({ 
        message: 'Нельзя удалить бронь с связанными заказами. Сначала удалите заказы.' 
      });
    }

    const result = await pool.query(`DELETE FROM reservations WHERE id=$1 RETURNING *`, [id]);

    if (result.rows.length === 0) return reply.status(404).send({ message: 'Бронь не найдена' });

    return reply.send({ message: 'Бронь успешно удалена', deletedReservation: result.rows[0] });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при удалении брони' });
  }
};

// Обновить статус брони (только админ)
export const updateReservationStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    const result = await pool.query(
      `UPDATE reservations SET status=$1 WHERE id=$2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0)
      return reply.status(404).send({ message: 'Бронь не найдена' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении статуса брони' });
  }
};
