const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/send-verification-email', authController.sendVerificationEmail);
router.post('/verify-email', authController.verifyEmail);

// Add this to your routes
router.get('/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: 'recipient@example.com',
      subject: 'SMTP Test',
      text: 'This is a test email'
    });
    res.send('Email sent successfully');
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).send('Failed to send test email');
  }
});

module.exports = router;
