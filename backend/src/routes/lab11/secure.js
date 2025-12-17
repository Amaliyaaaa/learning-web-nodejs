export default async function secureRoutes(fastify) {
  fastify.get("/profile", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userInfo = {
      id: request.user.id,
      login: request.user.login,
      role: request.user.role,
    };
    return userInfo;
  });

  fastify.get("/admin", {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (request.user.role !== "admin") {
      reply.code(403);
      return { error: "Forbidden: admin only" };
    }

    return {
      message: "Добро пожаловать в админский раздел!",
      user: {
        id: request.user.id,
        login: request.user.login,
        role: request.user.role,
      },
    };
  });
}

