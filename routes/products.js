const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
  const unit = typeof req.body?.unit === 'string' ? req.body.unit.trim() : '';
  const unitPrice = req.body?.unit_price;
  const reorderLevel = req.body?.reorder_level ?? 0;
  const stockOnHand = req.body?.stock_on_hand ?? 0;
  if (!name || !category || !unit || typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0 || !Number.isInteger(stockOnHand) || stockOnHand < 0) {
    return res.status(400).json({ error: 'name, category, unit, a non-negative unit_price, a non-negative integer reorder_level, and a non-negative integer stock_on_hand are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let categoryResult = await client.query(
      'SELECT category_id FROM category WHERE name = $1 AND store_id = $2',
      [category, req.user.store_id],
    );
    if (categoryResult.rowCount !== 1) {
      categoryResult = await client.query(
        `INSERT INTO category (store_id, name)
         VALUES ($1, $2)
         RETURNING category_id`,
        [req.user.store_id, category],
      );
    }
    const productResult = await client.query(
      `INSERT INTO product (store_id, category_id, name, unit_price, unit, reorder_level, stock_on_hand)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING product_id, name, category_id, unit_price, unit, reorder_level, stock_on_hand`,
      [req.user.store_id, categoryResult.rows[0].category_id, name, unitPrice, unit, reorderLevel, stockOnHand],
    );
    await client.query('COMMIT');
    const product = productResult.rows[0];
    return res.status(201).json({ ...product, unit_price: Number(product.unit_price), reorder_level: Number(product.reorder_level), stock_on_hand: Number(product.stock_on_hand) });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23503') return res.status(400).json({ error: 'The selected product category is not available for this store.' });
    console.error('Product create failed:', error.message);
    return res.status(503).json({ error: 'Product could not be created.' });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT product_id, name, category_id, unit_price, unit, reorder_level, stock_on_hand
      FROM product
      WHERE store_id = $1
      ORDER BY product_id
    `, [req.user.store_id]);
    return res.json(result.rows.map((product) => ({
      ...product,
      unit_price: Number(product.unit_price),
      reorder_level: Number(product.reorder_level),
      stock_on_hand: Number(product.stock_on_hand),
    })));
  } catch (error) {
    console.error('Product list query failed:', error.message);
    return res.status(503).json({ error: 'Product data is temporarily unavailable.' });
  }
});

router.delete('/:id', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Product ID must be a positive integer.' });

  try {
    const result = await pool.query(
      'DELETE FROM product WHERE product_id = $1 AND store_id = $2 RETURNING product_id',
      [productId, req.user.store_id],
    );
    if (result.rowCount !== 1) return res.status(404).json({ error: `Product ${productId} was not found.` });
    return res.json({ deleted: true, product_id: productId });
  } catch (error) {
    if (error.code === '23503') return res.status(409).json({ error: "This product can't be deleted because it has existing purchase or sale records." });
    console.error('Product delete failed:', error.message);
    return res.status(503).json({ error: 'Product could not be deleted.' });
  }
});

router.patch('/:id', async (req, res) => {
  const productId = Number(req.params.id);
  const { unit_price: unitPrice } = req.body || {};
  if (!Number.isInteger(productId) || productId <= 0 || typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return res.status(400).json({ error: 'A valid product ID and non-negative unit_price are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE product
       SET unit_price = $1
      WHERE product_id = $2 AND store_id = $3
       RETURNING product_id, name, category_id, unit_price, unit, reorder_level, stock_on_hand`,
      [unitPrice, productId, req.user.store_id],
    );
    if (result.rowCount !== 1) return res.status(404).json({ error: `Product ${productId} was not found.` });
    const product = result.rows[0];
    return res.json({ ...product, unit_price: Number(product.unit_price), reorder_level: Number(product.reorder_level), stock_on_hand: Number(product.stock_on_hand) });
  } catch (error) {
    console.error('Product update failed:', error.message);
    return res.status(503).json({ error: 'Product could not be updated.' });
  }
});

module.exports = router;