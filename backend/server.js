import Fastify from 'fastify';
import FastifyStatic from '@fastify/static';
import fastifyPostgres from '@fastify/postgres'; // <--- Импорт
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
// __dirname теперь будет /app/backend/ (внутри контейнера)
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

dotenv.config({ path: '.env.local' });

fastify.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL
});  

// --- РЕГИСТРАЦИЯ СТАТИКИ ---

fastify.register(FastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
});

// --- РЕГИСТРАЦИЯ РОУТЕРОВ ДЛЯ ЛАБОРАТОРНЫХ ---
// Пример для ЛР №7-9
import lab7Routes from './src/routes/lab7/index.js';
import lab8Routes from './src/routes/lab8/index.js';
import lab9Routes from './src/routes/lab9/index.js';
import task2Routes from './src/routes/lab9/task2.js';
import task3Routes from './src/routes/lab9/task3.js';


fastify.register(lab7Routes, { prefix: '/api/lab7' });
fastify.register(lab8Routes, { prefix: '/api/lab8' });
fastify.register(lab9Routes, { prefix: '/api/lab9' });
fastify.register(task2Routes, { prefix: '/api/lab9/task2' });
fastify.register(task3Routes, { prefix: '/api/lab9/task3' });

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
