const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendResetCode(toEmail, code) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: 'Your CashWise password reset code',
    text: `Your CashWise password reset code is ${code}. It expires in 15 minutes.`,
  });
}

module.exports = { sendResetCode };