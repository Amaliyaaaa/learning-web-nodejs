import authRoutes from "./auth.js";
import secureRoutes from "./secure.js";
import task1Routes from "./task1.js";
import task2Routes from "./task2.js";

export default async function lab11Routes(fastify, opts) {
  fastify.register(authRoutes);
  fastify.register(secureRoutes);
  fastify.register(task1Routes);
  fastify.register(task2Routes);
}

