import bcrypt from "bcrypt";
import {
  getAllUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  isLoginTaken,
  getRoleIdByName,
} from "../../services/lab11/user.service.js";

export default async function task2Routes(fastify) {
  if (!fastify.authenticate) {
    fastify.log.error('fastify.authenticate is not available in task2Routes');
  }
  
  fastify.get("/task2/users/public", async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const { page = 1, limit = 10 } = request.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await fastify.pg.query(
        `
        SELECT u.id, u.login, r.name AS role, u.created_at
        FROM lab11.users u
        JOIN lab11.roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [parseInt(limit), offset]
      );

      const countResult = await fastify.pg.query(
        `SELECT COUNT(*) as total FROM lab11.users`
      );

      return {
        users: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load users' });
    }
  });

  fastify.get("/task2/users", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const { page = 1, limit = 10 } = request.query;
      const result = await getAllUsers(fastify.pg, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load users' });
    }
  });

  fastify.get("/task2/users/:id", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const user = await findUserById(fastify.pg, parseInt(request.params.id));
      if (!user) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }
      delete user.password_hash;
      return user;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load user' });
    }
  });

  fastify.post("/task2/users", {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: "object",
        required: ["login", "password", "role"],
        properties: {
          login: { type: "string", minLength: 3 },
          password: { type: "string", minLength: 6 },
          role: { type: "string", enum: ["user", "admin"] },
        },
      },
    },
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    if (!request.user) {
      fastify.log.warn('POST /task2/users: request.user is not set');
      return reply.code(401).send({ error: "Unauthorized" });
    }
    fastify.log.info(`POST /task2/users: User ${request.user.login} (role: ${request.user.role}) attempting to create user`);
    if (request.user.role !== "admin") {
      fastify.log.warn(`Access denied for user ${request.user.login || 'unknown'} with role ${request.user.role || 'unknown'}`);
      return reply.code(403).send({ error: "Forbidden: admin only" });
    }
    try {
      const { login, password, role } = request.body;
      const pg = fastify.pg;

      const taken = await isLoginTaken(pg, login);
      if (taken) {
        return reply.code(400).send({
          error: "Пользователь с таким логином уже существует",
        });
      }

      const rounds = 10;
      const passwordHash = await bcrypt.hash(password, rounds);

      const user = await createUser(pg, {
        login,
        passwordHash,
        roleName: role,
      });

      reply.code(201);
      return {
        id: user.id,
        login: user.login,
        role_id: user.role_id,
        created_at: user.created_at,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create user' });
    }
  });

  fastify.put("/task2/users/:id", {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: "object",
        properties: {
          login: { type: "string", minLength: 3 },
          role: { type: "string", enum: ["user", "admin"] },
          password: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    if (!request.user) {
      fastify.log.warn('PUT /task2/users/:id: request.user is not set');
      return reply.code(401).send({ error: "Unauthorized" });
    }
    fastify.log.info(`PUT /task2/users/:id: User ${request.user.login} (role: ${request.user.role}) attempting to update user ${request.params.id}`);
    if (request.user.role !== "admin") {
      fastify.log.warn(`Access denied for user ${request.user.login || 'unknown'} with role ${request.user.role || 'unknown'}`);
      return reply.code(403).send({ error: "Forbidden: admin only" });
    }
    try {
      const userId = parseInt(request.params.id);
      const { login, role, password } = request.body;
      const pg = fastify.pg;

      const existingUser = await findUserById(pg, userId);
      if (!existingUser) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }

      if (login && login !== existingUser.login) {
        const taken = await isLoginTaken(pg, login);
        if (taken) {
          return reply.code(400).send({
            error: "Пользователь с таким логином уже существует",
          });
        }
      }

      // Хэшируем новый пароль, если он передан
      let passwordHash = undefined;
      if (password) {
        const rounds = 10;
        passwordHash = await bcrypt.hash(password, rounds);
      }

      const updatedUser = await updateUser(pg, userId, {
        login,
        roleName: role,
        passwordHash,
      });

      if (!updatedUser) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }

      return {
        id: updatedUser.id,
        login: updatedUser.login,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update user' });
    }
  });

  fastify.delete("/task2/users/:id", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    // Проверяем, что пользователь авторизован
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    // Проверяем роль админа
    if (request.user.role !== "admin") {
      fastify.log.warn(`Access denied for user ${request.user.login || 'unknown'} with role ${request.user.role || 'unknown'}`);
      return reply.code(403).send({ error: "Forbidden: admin only" });
    }
    try {
      const userId = parseInt(request.params.id);

      if (userId === request.user.id) {
        return reply.code(400).send({
          error: "Нельзя удалить самого себя",
        });
      }

      const deleted = await deleteUser(fastify.pg, userId);
      if (!deleted) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }

      return { message: "Пользователь удален", id: deleted.id };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete user' });
    }
  });

  fastify.post("/task2/users/:id/generate-password", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    // Проверяем, что пользователь авторизован
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    // Проверяем роль админа
    if (request.user.role !== "admin") {
      fastify.log.warn(`Access denied for user ${request.user.login} with role ${request.user.role}`);
      return reply.code(403).send({ error: "Forbidden: admin only" });
    }
    try {
      const userId = parseInt(request.params.id);
      const pg = fastify.pg;

      const user = await findUserById(pg, userId);
      if (!user) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }

      const generatePassword = () => {
        const length = 12;
        const charset =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
          password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
      };

      const newPassword = generatePassword();
      const rounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, rounds);

      await updateUser(pg, userId, { passwordHash });

      return {
        message: "Пароль успешно сгенерирован",
        password: newPassword,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to generate password' });
    }
  });
}

