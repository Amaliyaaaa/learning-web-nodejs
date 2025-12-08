// backend/src/services/lab9/product.service.js
class ProductService {
    // Получить все товары
    // db - это клиент базы данных, который мы передадим из роута
    async getAll(db) {
        const query = 'SELECT * FROM lab9.products ORDER BY id DESC';
        const { rows } = await db.query(query);
        return rows;
    }
    // Создать товар
    async create(db, productData) {
        const { title, price, amount } = productData;
        // Используем параметризованный запрос ($1, $2, $3) для защиты от SQLинъекций
        const query = `
INSERT INTO lab9.products (title, price, amount)
VALUES ($1, $2, $3)
RETURNING *
`;
        const { rows } = await db.query(query, [title, price, amount]);
        return rows[0];
    }
    // Удалить товар
    async delete(db, id) {
        const query = 'DELETE FROM lab9.products WHERE id = $1 RETURNING id';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
}
export default new ProductService();