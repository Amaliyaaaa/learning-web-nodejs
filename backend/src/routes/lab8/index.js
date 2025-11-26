import task1Service from '../../services/lab8/task1.service.js';
import task2Service from '../../services/lab8/task2.service.js';
import task3Service from '../../services/lab8/task3.service.js';
import { createUserBodySchema } from '../../schemas/lab8/task1.schema.js';

export default async function routes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    return {
      lab: "№8",
      description: "Это главный API-эндпоинт для примеров Lab8.",
    };
  });

  fastify.get("/task1/makeInitials", async (request, reply) => {
    const { lastname, firstname, surname } = request.query;
    if (!lastname || !firstname || !surname) {
      return reply.code(400).send({ error: "Необходимо указать фамилию, имя и отчество" });
    }
    return task1Service.makeInitials(lastname, firstname, surname);
  });

  fastify.get("/task1/makeProjectStatus", async (request, reply) => {
    const { lastname, firstname, surname, projectParticipant } = request.query;
    if (!lastname || !firstname || !surname) {
      return reply.code(400).send({ error: "Необходимо указать фамилию, имя и отчество" });
    }
    return task1Service.makeProjectStatus(lastname, firstname, surname, projectParticipant === "true" || projectParticipant === "on");
  });

  fastify.post("/task1", {
    schema: {
      body: createUserBodySchema
    }
  }, async (request, reply) => {
    const newUser = await task1Service.create(request.body);
    return reply.code(201).send(newUser);
  });

  fastify.get("/task1", async () => task1Service.getAll());

  fastify.get("/task2/groups", async (request, reply) => {
    try {
      await task2Service.processAndSave();
      const groups = await task2Service.getGroups();
      return groups;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message || 'Ошибка при получении данных о группах' });
    }
  });

  fastify.get("/task2/stadiums", async (request, reply) => {
    try {
      await task2Service.processAndSave();
      const stadiums = await task2Service.getStadiums();
      return stadiums;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message || 'Ошибка при получении данных о стадионах' });
    }
  });
  fastify.get("/task3/results", async (request, reply) => {
    try {
      await task3Service.generateResults();
      const results = await task3Service.getResults();
      return results;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: error.message || 'Ошибка при получении результатов матчей' });
    }
  });
}

