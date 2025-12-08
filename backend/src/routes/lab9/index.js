// backend/src/routes/lab9/index.js
import productService from '../../services/lab9/product.service.js';
export default async function routes(fastify, options) {
    // GET /api/lab9/products
    fastify.get('/', async (request, reply) => {
        // Внедрение зависимости: передаем fastify.pg в сервис
        const products = await productService.getAll(fastify.pg);
        return products;
    });
    // POST /api/lab9/products
    fastify.post('/', async (request, reply) => {
        // TODO: В следующей работе добавим JSON Schema для валидации (как в ЛР8)
        const newProduct = await productService.create(fastify.pg, request.body);
        reply.code(201).send(newProduct);
    });
    // DELETE /api/lab9/products/:id
    fastify.delete('/:id', async (request, reply) => {
        const deleted = await productService.delete(fastify.pg, request.params.id);
        if (!deleted) {
            return reply.code(404).send({ error: 'Product not found' });
        }
        return { message: 'Deleted', id: deleted.id };
    });
}