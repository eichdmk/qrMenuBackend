import pool from '../db.js';

// Добавить новый столик
export const createTable = async (request, reply) => {
  try {
    const { name, seats } = request.body;
    const result = await pool.query(
      `INSERT INTO tables (name, seats) VALUES ($1, $2) RETURNING *`,
      [name, seats]
    );
    return reply.status(201).send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при добавлении столика' });
  }
};


// Получить все столики с информацией о доступности (для бронирования)
export const getTablesWithAvailability = async (request, reply) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.seats, t.is_occupied,
              COUNT(CASE WHEN o.status NOT IN ('completed', 'cancelled') THEN 1 END) as active_orders_count,
              COUNT(CASE WHEN r.status IN ('pending', 'confirmed') THEN 1 END) as active_reservations_count
       FROM tables t
       LEFT JOIN orders o ON t.id = o.table_id
       LEFT JOIN reservations r ON t.id = r.table_id
       GROUP BY t.id, t.name, t.seats, t.is_occupied
       ORDER BY t.id`
    );

    const tablesWithAvailability = result.rows.map(table => ({
      ...table,
      is_available: !table.is_occupied && 
                   parseInt(table.active_orders_count) === 0 && 
                   parseInt(table.active_reservations_count) === 0,
      availability_reason: table.is_occupied ? 'Занят' :
                          parseInt(table.active_orders_count) > 0 ? 'Активные заказы' :
                          parseInt(table.active_reservations_count) > 0 ? 'Забронирован' :
                          'Доступен'
    }));

    return reply.send(tablesWithAvailability);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении столиков' });
  }
};

// Получить доступность столиков на конкретную дату и время
export const getTablesAvailabilityForDateTime = async (request, reply) => {
  try {
    const { date, time } = request.query;
    
    if (!date || !time) {
      return reply.status(400).send({ message: 'Необходимо указать дату и время' });
    }

    const start_at = new Date(`${date}T${time}:00`);
    const end_at = new Date(start_at);
    end_at.setHours(end_at.getHours() + 2);

    const twoHoursBeforeStart = new Date(start_at.getTime() - 2 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT t.id, t.name, t.seats,
              COUNT(CASE WHEN r.status IN ('pending', 'confirmed') 
                        AND NOT (r.end_at <= $1::timestamptz OR r.start_at >= $2::timestamptz)
                        THEN 1 END) as conflicting_reservations_count,
              COUNT(CASE WHEN o.status NOT IN ('completed', 'cancelled')
                        AND o.created_at >= $3::timestamptz
                        AND DATE(o.created_at) >= DATE($4::timestamptz)
                        THEN 1 END) as active_orders_count
       FROM tables t
       LEFT JOIN reservations r ON t.id = r.table_id
       LEFT JOIN orders o ON t.id = o.table_id
       GROUP BY t.id, t.name, t.seats
       ORDER BY t.id`,
      [start_at.toISOString(), end_at.toISOString(), twoHoursBeforeStart.toISOString(), start_at.toISOString()]
    );

    const tablesWithAvailability = result.rows.map(table => ({
      ...table,
      is_available: parseInt(table.conflicting_reservations_count) === 0 && 
                   parseInt(table.active_orders_count) === 0,
      availability_reason: parseInt(table.conflicting_reservations_count) > 0 ? 'Забронирован в это время' :
                          parseInt(table.active_orders_count) > 0 ? 'Активные заказы в это время' :
                          'Доступен'
    }));

    return reply.send(tablesWithAvailability);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении доступности столиков' });
  }
};

// Получить все столики
export const getAllTables = async (request, reply) => {
  try {
    const result = await pool.query(
      `SELECT id, name, token, seats, is_occupied, created_at FROM tables ORDER BY id`
    );
    return reply.send(result.rows);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении столиков' });
  }
};

// Получить столик по токену (для QR)
export const getTableByToken = async (request, reply) => {
  try {
    const { token } = request.params;
    const result = await pool.query(
      `SELECT id, name, token, seats, is_occupied FROM tables WHERE token=$1`,
      [token]
    );
    if (result.rows.length === 0) return reply.status(404).send({ message: 'Столик не найден' });
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при поиске столика' });
  }
};

// Получить столик по ID (админ)
export const getTableById = async (request, reply) => {
  try {
    const { id } = request.params;
    const result = await pool.query(
      `SELECT id, name, token, seats, is_occupied, created_at FROM tables WHERE id=$1`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ message: 'Столик не найден' });
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при получении столика' });
  }
};

// Обновить столик (админ)
export const updateTable = async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, seats, is_occupied } = request.body;

    const result = await pool.query(
      `UPDATE tables SET name=$1, seats=$2, is_occupied=$3 WHERE id=$4 RETURNING *`,
      [name, seats, is_occupied, id]
    );

    if (result.rows.length === 0) return reply.status(404).send({ message: 'Столик не найден' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении столика' });
  }
};

// Удалить столик (админ)
export const deleteTable = async (request, reply) => {
  try {
    const { id } = request.params;

    const ordersResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE table_id=$1 AND status NOT IN ('completed', 'cancelled')`,
      [id]
    );

    if (parseInt(ordersResult.rows[0].count) > 0) {
      return reply.status(400).send({ 
        message: 'Нельзя удалить столик с активными заказами. Сначала завершите все заказы.' 
      });
    }

    const reservationsResult = await pool.query(
      `SELECT COUNT(*) FROM reservations WHERE table_id=$1 AND status IN ('pending', 'confirmed')`,
      [id]
    );

    if (parseInt(reservationsResult.rows[0].count) > 0) {
      return reply.status(400).send({ 
        message: 'Нельзя удалить столик с активными бронированиями. Сначала отмените бронирования.' 
      });
    }

    const result = await pool.query(`DELETE FROM tables WHERE id=$1 RETURNING *`, [id]);

    if (result.rows.length === 0) return reply.status(404).send({ message: 'Столик не найден' });

    return reply.send({ message: 'Столик успешно удален', deletedTable: result.rows[0] });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при удалении столика' });
  }
};

// Обновить статус столика (занят/свободен) — только админ
export const updateTableStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { is_occupied } = request.body;

    const result = await pool.query(
      `UPDATE tables SET is_occupied=$1 WHERE id=$2 RETURNING *`,
      [is_occupied, id]
    );

    if (result.rows.length === 0) return reply.status(404).send({ message: 'Столик не найден' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при обновлении статуса столика' });
  }
};
