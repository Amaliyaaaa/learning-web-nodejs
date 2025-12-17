// src/services/lab11/user.service.js
// Сервис для работы с пользователями и ролями в схеме lab11.
// Здесь — только работа с БД.

/**
 * Найти пользователя по логину.
 * Возвращает объект пользователя или null.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg - fastify.pg
 * @param {string} login
 */
export async function findUserByLogin(pg, login) {
  const result = await pg.query(
    `
    SELECT u.id, u.login, u.password_hash, r.name AS role
    FROM lab11.users u
    JOIN lab11.roles r ON u.role_id = r.id
    WHERE u.login = $1
    `,
    [login],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Найти пользователя по ID.
 * Возвращает объект пользователя или null.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {number} id
 */
export async function findUserById(pg, id) {
  const result = await pg.query(
    `
    SELECT u.id, u.login, u.password_hash, r.name AS role, u.created_at
    FROM lab11.users u
    JOIN lab11.roles r ON u.role_id = r.id
    WHERE u.id = $1
    `,
    [id],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Получить id роли по имени.
 * Бросает ошибку, если роль не найдена — это уже ошибка конфигурации БД.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {string} roleName - например, 'user' или 'admin'
 */
export async function getRoleIdByName(pg, roleName) {
  const result = await pg.query(
    `
    SELECT id FROM lab11.roles WHERE name = $1
    `,
    [roleName],
  );
  if (result.rowCount === 0) {
    throw new Error(`Роль "${roleName}" не найдена в lab11.roles`);
  }
  return result.rows[0].id;
}

/**
 * Создать нового пользователя.
 * По умолчанию даём роль 'user', но можно передать другую.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {object} opts
 * @param {string} opts.login
 * @param {string} opts.passwordHash - уже посчитанный bcrypt-хэш
 * @param {string} [opts.roleName='user']
 */
export async function createUser(pg, { login, passwordHash, roleName = "user" }) {
  // 1. Узнаём id роли
  const roleId = await getRoleIdByName(pg, roleName);

  // 2. Создаём пользователя
  const result = await pg.query(
    `
    INSERT INTO lab11.users (login, password_hash, role_id)
    VALUES ($1, $2, $3)
    RETURNING id, login, role_id, created_at
    `,
    [login, passwordHash, roleId],
  );
  return result.rows[0];
}

/**
 * Проверить, что логин свободен.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {string} login
 * @returns {Promise<boolean>} true, если логин уже занят
 */
export async function isLoginTaken(pg, login) {
  const result = await pg.query(
    `
    SELECT 1 FROM lab11.users WHERE login = $1 LIMIT 1
    `,
    [login],
  );
  return result.rowCount > 0;
}

/**
 * Обновить пароль пользователя.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {number} userId
 * @param {string} passwordHash - новый bcrypt-хэш
 */
export async function updateUserPassword(pg, userId, passwordHash) {
  const result = await pg.query(
    `
    UPDATE lab11.users
    SET password_hash = $1
    WHERE id = $2
    RETURNING id, login, role_id, created_at
    `,
    [passwordHash, userId],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Получить всех пользователей.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {object} opts
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 */
export async function getAllUsers(pg, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const result = await pg.query(
    `
    SELECT u.id, u.login, r.name AS role, u.created_at
    FROM lab11.users u
    JOIN lab11.roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );
  const countResult = await pg.query(
    `SELECT COUNT(*) as total FROM lab11.users`
  );
  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    limit
  };
}

/**
 * Обновить пользователя.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {number} userId
 * @param {object} opts
 * @param {string} [opts.login]
 * @param {string} [opts.roleName]
 * @param {string} [opts.passwordHash]
 */
export async function updateUser(pg, userId, { login, roleName, passwordHash }) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (login !== undefined) {
    updates.push(`login = $${paramIndex++}`);
    values.push(login);
  }

  if (roleName !== undefined) {
    const roleId = await getRoleIdByName(pg, roleName);
    updates.push(`role_id = $${paramIndex++}`);
    values.push(roleId);
  }

  if (passwordHash !== undefined) {
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }

  if (updates.length === 0) {
    return await findUserById(pg, userId);
  }

  values.push(userId);
  const result = await pg.query(
    `
    UPDATE lab11.users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, login, role_id, created_at
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  const user = result.rows[0];
  // Получаем роль по имени
  const roleResult = await pg.query(
    `SELECT name FROM lab11.roles WHERE id = $1`,
    [user.role_id]
  );
  user.role = roleResult.rows[0].name;

  return user;
}

/**
 * Удалить пользователя.
 *
 * @param {import("@fastify/postgres").PostgresDb} pg
 * @param {number} userId
 */
export async function deleteUser(pg, userId) {
  const result = await pg.query(
    `
    DELETE FROM lab11.users
    WHERE id = $1
    RETURNING id, login
    `,
    [userId],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

