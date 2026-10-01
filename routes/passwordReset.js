const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { sendResetCode } = require('../email');

const router = express.Router();
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const genericMessage = 'If that email exists, a code has been sent.';
  if (!email) return res.status(400).json({ error: 'A valid email is required.' });

  try {
    const userResult = await pool.query('SELECT user_id FROM app_user WHERE email = $1', [email]);
    if (userResult.rowCount === 1) {
      const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
      await pool.query(
        `INSERT INTO password_reset_code (user_id, code, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')`,
        [userResult.rows[0].user_id, code],
      );
      await sendResetCode(email, code);
    }
    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot-password request failed:', error.message);
    return res.status(503).json({ error: 'The reset request is temporarily unavailable.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const newPassword = req.body?.new_password;
  if (!email || !/^\d{6}$/.test(code) || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Email, a 6-digit code, and a new password of at least 8 characters are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const codeResult = await client.query(
      `SELECT password_reset_code.id, password_reset_code.user_id
       FROM password_reset_code
       JOIN app_user ON app_user.user_id = password_reset_code.user_id
       WHERE app_user.email = $1
         AND password_reset_code.code = $2
         AND password_reset_code.used = FALSE
         AND password_reset_code.expires_at > CURRENT_TIMESTAMP
       ORDER BY password_reset_code.created_at DESC
       LIMIT 1
       FOR UPDATE OF password_reset_code`,
      [email, code],
    );
    if (codeResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'That reset code is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const reset = codeResult.rows[0];
    await client.query('UPDATE app_user SET password_hash = $1 WHERE user_id = $2', [passwordHash, reset.user_id]);
    await client.query('UPDATE password_reset_code SET used = TRUE WHERE id = $1', [reset.id]);
    await client.query('COMMIT');
    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Password reset failed:', error.message);
    return res.status(503).json({ error: 'Password reset is temporarily unavailable.' });
  } finally {
    client.release();
  }
});

module.exports = router;