import Fastify from 'fastify';
import FastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
// __dirname теперь будет /app/backend/ (внутри контейнера)
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

// --- РЕГИСТРАЦИЯ СТАТИКИ ---

fastify.register(FastifyStatic, {
  root: path.join(__dirname, '..', 'public/'),
});

// --- РЕГИСТРАЦИЯ РОУТЕРОВ ДЛЯ ЛАБОРАТОРНЫХ ---
// Пример для ЛР №7-8
import lab7Routes from './src/routes/lab7/index.js';
import lab8Routes from './src/routes/lab8/index.js';

fastify.register(lab7Routes, { prefix: '/api/lab7' });
fastify.register(lab8Routes, { prefix: '/api/lab8' });

// Здесь добавляем новые строки для каждой лабы

// --- ЗАПУСК СЕРВERA ---
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
