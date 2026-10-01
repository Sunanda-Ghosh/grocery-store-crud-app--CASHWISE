const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.patch('/profile', async (req, res) => {
  const storeName = typeof req.body?.store_name === 'string' ? req.body.store_name.trim() : undefined;
  if (storeName === '') return res.status(400).json({ error: 'store_name cannot be empty.' });
  if (storeName === undefined) return res.status(400).json({ error: 'No editable profile fields were provided.' });

  try {
    const result = await pool.query(
      `UPDATE store
       SET store_name = $1
       WHERE owner_user_id = $2
       RETURNING store_id, store_name`,
      [storeName, req.user.user_id],
    );
    if (result.rowCount !== 1) return res.status(404).json({ error: 'Profile not found.' });
    return res.json({
      user_id: req.user.user_id,
      email: req.user.email,
      store_id: result.rows[0].store_id,
      store_name: result.rows[0].store_name,
    });
  } catch (error) {
    console.error('Profile update failed:', error.message);
    return res.status(503).json({ error: 'Profile update is temporarily unavailable.' });
  }
});

router.post('/change-password', async (req, res) => {
  const currentPassword = req.body?.current_password;
  const newPassword = req.body?.new_password;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'current_password and a new password of at least 8 characters are required.' });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM app_user WHERE user_id = $1', [req.user.user_id]);
    if (result.rowCount !== 1 || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'The current password is incorrect.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE app_user SET password_hash = $1 WHERE user_id = $2', [passwordHash, req.user.user_id]);
    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change failed:', error.message);
    return res.status(503).json({ error: 'Password change is temporarily unavailable.' });
  }
});

module.exports = router;