const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  // Validate email address
  if (!to || typeof to !== 'string') {
    throw new Error('Invalid email address: email is required');
  }
  
  const trimmedEmail = to.trim();
  if (!trimmedEmail) {
    throw new Error('Invalid email address: email is empty');
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Invalid email address format');
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: trimmedEmail,
    subject,
    text,
  });
};

module.exports = sendEmail;
