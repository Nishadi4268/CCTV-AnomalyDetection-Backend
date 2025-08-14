const express = require('express');
const app = express();
const User = require('../models/User');
app.use(express.json());
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const VerificationToken = require('../models/VerificationToken');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const users = [];

exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide first name, last name, email, password, and confirm password' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password and confirm password do not match' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // 2. Find user with password
    const user = await User.findOne({ email: email.toLowerCase().trim() })
                          .select('+password');

    // 3. Check user exists and password matches
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 5. Remove password from output
    user.password = undefined;

    // 6. Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during signin'
    });
  }
};

// Generate and send verification email
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate verification token (6-digit OTP)
    const token = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save to database
    await VerificationToken.findOneAndUpdate(
      { email },
      { token, expiresAt },
      { upsert: true, new: true }
    );

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
  port: 587,
  secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
       tls: {
    ciphers: 'SSLv3' // Add this for some older servers
  }
    });

    // Send email
    await transporter.sendMail({
  from: `"SafeVision Email Verification" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: '✨ Your Verification Code for SafeVision',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    
      <!-- Main Container -->
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header with Branding -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 28px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email Address</h1>
        </div>
        
        <!-- Hero Section -->
        <div style="padding: 32px 24px; text-align: center;">
          <img src="https://example.com/email-verification-icon.png" alt="Email Verification" style="height: 80px; margin-bottom: 24px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">Welcome to SafeVision!</h2>
          <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.5;">
            Thank you for signing up! To complete your registration and secure your account, please verify your email address by entering the following code:
          </p>
          
          <!-- OTP Code Box -->
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; 
              display: inline-block; margin: 0 auto 24px; 
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; 
                color: #1f2937; font-family: monospace; padding: 0 20px;">
              ${token}
            </div>
          </div>
          
          <!-- Instructions -->
          <div style="text-align: left; background: #f8fafc; border-left: 4px solid #2563eb; 
              padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
            <p style="color: #4b5563; margin: 0; font-size: 14px;">
              <strong>How to use this code:</strong><br>
              1. Return to SafeVision<br>
              2. Enter the 6-digit code above<br>
              3. Complete your registration
            </p>
          </div>
          
          <!-- CTA Button -->
          
          
          <!-- Expiration Notice -->
          <p style="color: #6b7280; margin: 0; font-size: 13px;">
            ⏳ This code will expire in <strong>15 minutes</strong> for security reasons.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; 
            border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0 0 8px 0;">
            If you didn't request this email, please ignore it or contact support.
          </p>
          <p style="margin: 0;">
            © ${new Date().getFullYear()} <a href="https://yourapp.com" style="color: #2563eb; text-decoration: none;">SafeVision</a>. 
            All rights reserved.
          </p>
          <div style="margin-top: 16px;">
            <a href="#" style="margin: 0 8px;"><img src="https://example.com/twitter-icon.png" alt="Twitter" style="height: 20px;"></a>
            <a href="#" style="margin: 0 8px;"><img src="https://example.com/facebook-icon.png" alt="Facebook" style="height: 20px;"></a>
            <a href="#" style="margin: 0 8px;"><img src="https://example.com/instagram-icon.png" alt="Instagram" style="height: 20px;"></a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
});

    res.status(200).json({ 
      message: 'Verification email sent',
      expiresAt 
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

// Verify OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    // Find the token in database
    const verification = await VerificationToken.findOne({ email });

    if (!verification) {
      return res.status(400).json({ error: 'No verification request found for this email' });
    }

    // Check if token matches
    if (verification.token !== token) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark email as verified (you might want to update user record here)
    await VerificationToken.deleteOne({ email });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};