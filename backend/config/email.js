const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

// Detect if running in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Use production URL if in production environment
const PRODUCTION_URL = 'https://my-mushagashe.onrender.com';
const effectiveFrontendUrl = isProduction ? PRODUCTION_URL : FRONTEND_URL;

// Create transporter
const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials not configured. Email functionality will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
};

// Generate secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email service not configured. Verification link:', `${effectiveFrontendUrl}/verify-email?token=${token}`);
    return false;
  }

  const verificationUrl = `${effectiveFrontendUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Mushagashe VTC" <${EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address - Mushagashe Vocational Training Centre',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6B21A8, #7C3AED); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Mushagashe Vocational Training Centre</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Skills for Development</p>
        </div>
        
        <h2 style="color: #6B21A8; margin-bottom: 20px;">Verify Your Email Address</h2>
        
        <p>Thank you for registering at Mushagashe Vocational Training Centre. To complete your registration and access the student portal, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6B21A8, #7C3AED); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours. If you did not create an account, please ignore this email.</p>
        
        <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Mushagashe Vocational Training Centre. All rights reserved.</p>
          <p>Masvingo, Zimbabwe</p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email service not configured. Reset link:', `${effectiveFrontendUrl}/reset-password?token=${token}`);
    return false;
  }

  const resetUrl = `${effectiveFrontendUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Mushagashe VTC" <${EMAIL_FROM}>`,
    to: email,
    subject: 'Reset Your Password - Mushagashe Vocational Training Centre',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6B21A8, #7C3AED); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Mushagashe Vocational Training Centre</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Skills for Development</p>
        </div>
        
        <h2 style="color: #6B21A8; margin-bottom: 20px;">Reset Your Password</h2>
        
        <p>We received a request to reset your password for your Mushagashe VTC account. Click the button below to set a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6B21A8, #7C3AED); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        
        <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Mushagashe Vocational Training Centre. All rights reserved.</p>
          <p>Masvingo, Zimbabwe</p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isEmailConfigured: () => !!(EMAIL_USER && EMAIL_PASS)
};
