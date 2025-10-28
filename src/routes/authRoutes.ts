import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// --- Debug route (optional, for env testing) ---
router.get('/google/debug', (_req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL,
    CALLBACK: process.env.GOOGLE_CALLBACK_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
});

// --- Standard Auth ---
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// --- Google OAuth ---
router.get('/google', (req, res, next) => {
  console.log('Initiating Google OAuth flow...');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  console.log('Handling Google OAuth callback...');
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google Auth Error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google-auth-error`);
    }
    if (!user) {
      console.warn('Google Auth Failed:', info?.message);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google-failed`);
    }
    if (!user.id) {
      console.error('User object missing ID after Google auth');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid-user`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Passport req.logIn error:', loginErr);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=session-error`);
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET missing.');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=server-config-error`);
      }

      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '30d' });
      console.log('✅ Google login successful — redirecting to frontend...');
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
    });
  })(req, res, next);
});

export default router;
