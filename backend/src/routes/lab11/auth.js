import bcrypt from "bcrypt";
import { isLoginTaken, createUser, findUserByLogin, updateUserPassword } from "../../services/lab11/user.service.js";

export default async function authRoutes(fastify) {
  fastify.post("/register", {
    schema: {
      body: {
        type: "object",
        required: ["login", "password"],
        properties: {
          login: { type: "string", minLength: 3 },
          password: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const { login, password } = request.body;
      const pg = fastify.pg;

      const taken = await isLoginTaken(pg, login);
      if (taken) {
        reply.code(400);
        return { error: "Пользователь с таким логином уже существует" };
      }

      const rounds = 10;
      const passwordHash = await bcrypt.hash(password, rounds);

      const user = await createUser(pg, {
        login,
        passwordHash,
        roleName: "user",
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
      return reply.code(500).send({ error: 'Failed to register user' });
    }
  });

  fastify.post("/login", {
    schema: {
      body: {
        type: "object",
        required: ["login", "password"],
        properties: {
          login: { type: "string", minLength: 3 },
          password: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const { login, password } = request.body;
      const pg = fastify.pg;

      const user = await findUserByLogin(pg, login);
      if (!user) {
        reply.code(401);
        return { error: "Неверный логин или пароль" };
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        reply.code(401);
        return { error: "Неверный логин или пароль" };
      }

      if (!fastify.jwt) {
        reply.code(500);
        return { error: "JWT authentication is not configured. Please set SECRET_KEY in .env.local" };
      }

      const payload = {
        id: user.id,
        login: user.login,
        role: user.role,
      };

      const token = fastify.jwt.sign(payload, { expiresIn: "15m" });

      return {
        token,
        user: {
          id: user.id,
          login: user.login,
          role: user.role,
        },
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to login' });
    }
  });

  fastify.post("/logout", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    return { message: "Logged out successfully" };
  });

  fastify.post("/change-password", {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: "object",
        required: ["oldPassword", "newPassword"],
        properties: {
          oldPassword: { type: "string", minLength: 6 },
          newPassword: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    if (!fastify.pg) {
      return reply.code(503).send({ error: 'Database not available' });
    }
    try {
      const { oldPassword, newPassword } = request.body;
      const pg = fastify.pg;
      const userId = request.user.id;

      const { findUserById } = await import("../../services/lab11/user.service.js");
      const user = await findUserById(pg, userId);
      if (!user) {
        reply.code(404);
        return { error: "Пользователь не найден" };
      }

      const ok = await bcrypt.compare(oldPassword, user.password_hash);
      if (!ok) {
        reply.code(401);
        return { error: "Неверный текущий пароль" };
      }

      const rounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, rounds);

      await updateUserPassword(pg, userId, passwordHash);

      return { message: "Пароль успешно изменен" };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to change password' });
    }
  });
}

