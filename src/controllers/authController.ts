import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail';

const generateToken = (id: number) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ id }, jwtSecret, { expiresIn: '30d' });
};

// --- Register User ---
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatarSeed = encodeURIComponent(email);
    const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${avatarSeed}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatarUrl,
      },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    });

    res.status(201).json({
      ...user,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Login User ---
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password === null) {
      return res.status(400).json({ message: 'Invalid credentials or OAuth login' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };

    res.json({
      ...userResponse,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Get Current User (Me) ---
export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: (req.user as any).id },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
};

// --- Forgot Password ---
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpires,
      },
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`;

    const message = `
      You requested a password reset.
      Click the following link (valid for 10 minutes):
      ${resetUrl}
      If you did not request this, ignore this email.
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your WeManage Password Reset Link',
      text: message,
    });

    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    try {
      await prisma.user.updateMany({
        where: { email },
        data: { passwordResetToken: null, passwordResetExpires: null },
      });
    } catch (clearErr) {
      console.error('Error clearing token after failure:', clearErr);
    }
    res.status(500).json({ message: 'Error sending reset email' });
  }
};

// --- Reset Password ---
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset token invalid or expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
