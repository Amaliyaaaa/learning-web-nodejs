// backend/src/services/lab10/shop.service.js
class ShopService {
  async getCategories(db) {
    const { rows } = await db.query('SELECT * FROM lab10.categories ORDER BY name');
    return rows;
  }

  async getProducts(db, { page = 1, limit = 9, categoryId, search }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (categoryId) {
      values.push(categoryId);
      conditions.push(`p.category_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`p.title ILIKE $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
      SELECT p.*, c.name as category_title
      FROM lab10.products p
      LEFT JOIN lab10.categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.id
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const dataResult = await db.query(sql, [...values, limit, offset]);

    const countSql = `SELECT COUNT(*) FROM lab10.products p ${whereClause}`;
    const countResult = await db.query(countSql, values);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }

  async getProductById(db, id) {
    const query = `
      SELECT p.*, c.name as category_title
      FROM lab10.products p
      LEFT JOIN lab10.categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  async getOrderById(db, id) {
    const query = `
      SELECT 
        o.id,
        o.created_at,
        o.product_id,
        p.title as product_title,
        p.price
      FROM lab10.orders o
      JOIN lab10.products p ON o.product_id = p.id
      WHERE o.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) return null;

    const orderId = rows[0].id;
    const created_at = rows[0].created_at;
    
    const itemsMap = new Map();
    rows.forEach(row => {
      const key = row.product_id;
      if (itemsMap.has(key)) {
        itemsMap.get(key).quantity++;
      } else {
        itemsMap.set(key, {
          product_id: row.product_id,
          product_title: row.product_title,
          price: row.price,
          quantity: 1
        });
      }
    });

    const items = Array.from(itemsMap.values());
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      id: orderId,
      created_at: created_at,
      items: items,
      total_amount: total_amount
    };
  }

  async getAllOrders(db, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        o.id,
        o.created_at,
        p.title as product_title,
        p.price
      FROM lab10.orders o
      JOIN lab10.products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = 'SELECT COUNT(*) FROM lab10.orders';
    
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [limit, offset]),
      db.query(countQuery)
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }

  async buyProduct(db, productId) {
    const pool = db.pool || db;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const checkRes = await client.query(
        'SELECT amount FROM lab10.products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Товар не найден');
      }
      
      const product = checkRes.rows[0];
      if (product.amount <= 0) {
        await client.query('ROLLBACK');
        throw new Error('Товар закончился');
      }

      await client.query(
        'UPDATE lab10.products SET amount = amount - 1 WHERE id = $1',
        [productId]
      );

      const orderRes = await client.query(
        'INSERT INTO lab10.orders (product_id) VALUES ($1) RETURNING id',
        [productId]
      );

      await client.query('COMMIT');
      return { orderId: orderRes.rows[0].id };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async buyProducts(db, items) {
    const pool = db.pool || db;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderIds = [];
      
      for (const item of items) {
        const { productId, quantity } = item;
        
        const checkRes = await client.query(
          'SELECT amount FROM lab10.products WHERE id = $1 FOR UPDATE',
          [productId]
        );

        if (checkRes.rows.length === 0) {
          await client.query('ROLLBACK');
          throw new Error(`Товар с ID ${productId} не найден`);
        }

        const product = checkRes.rows[0];
        if (product.amount < quantity) {
          await client.query('ROLLBACK');
          throw new Error(`Недостаточно товара с ID ${productId}. Доступно: ${product.amount}, запрошено: ${quantity}`);
        }

        await client.query(
          'UPDATE lab10.products SET amount = amount - $1 WHERE id = $2',
          [quantity, productId]
        );

        for (let i = 0; i < quantity; i++) {
          const orderRes = await client.query(
            'INSERT INTO lab10.orders (product_id) VALUES ($1) RETURNING id',
            [productId]
          );
          orderIds.push(orderRes.rows[0].id);
        }
      }

      await client.query('COMMIT');
      return { orderIds };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  
  async createProduct(db, productData) {
    const { title, price, amount, category_id, description, image_url } = productData;
    const query = `
      INSERT INTO lab10.products (title, price, amount, category_id, description, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await db.query(query, [title, price, amount, category_id, description || null, image_url || null]);
    return rows[0];
  }

  async updateProduct(db, id, productData) {
    const { title, price, amount, category_id, description, image_url } = productData;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(category_id);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }

    if (updates.length === 0) {
      return await this.getProductById(db, id);
    }

    values.push(id);
    const query = `
      UPDATE lab10.products
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const { rows } = await db.query(query, values);
    return rows[0] || null;
  }

  async deleteProduct(db, id) {
    const query = `
      DELETE FROM lab10.products
      WHERE id = $1
      RETURNING id, title
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  async getCategoryById(db, id) {
    const query = 'SELECT * FROM lab10.categories WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  async createCategory(db, name) {
    const query = `
      INSERT INTO lab10.categories (name)
      VALUES ($1)
      RETURNING *
    `;
    const { rows } = await db.query(query, [name]);
    return rows[0];
  }

  async updateCategory(db, id, name) {
    const query = `
      UPDATE lab10.categories
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await db.query(query, [name, id]);
    return rows[0] || null;
  }

  async deleteCategory(db, id) {
    const checkQuery = 'SELECT COUNT(*) FROM lab10.products WHERE category_id = $1';
    const { rows: checkRows } = await db.query(checkQuery, [id]);
    const productCount = parseInt(checkRows[0].count);
    
    if (productCount > 0) {
      throw new Error(`Нельзя удалить категорию: в ней есть ${productCount} товар(ов)`);
    }

    const query = `
      DELETE FROM lab10.categories
      WHERE id = $1
      RETURNING id, name
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }
}

export default new ShopService();

