import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Needed for password reset token
import sendEmail from '../utils/sendEmail'; // Needed for sending reset email
import { AuthRequest } from '../middleware/auth';

// --- JWT Token Generation ---
const generateToken = (id: number) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ id }, jwtSecret, { expiresIn: '30d' });
};

// --- Register New User ---
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

    // Generate DiceBear URL
    const avatarSeed = encodeURIComponent(email);
    const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${avatarSeed}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        // Ensure password field exists and is optional in schema
        password: hashedPassword,
        avatarUrl: avatarUrl,
        // provider and providerId will be null for email registration
      },
      select: { id: true, name: true, email: true, avatarUrl: true }
    });

    res.status(201).json({
      ...user,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error("REGISTRATION ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Log In User ---
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Check if user exists and used email/password signup (password is not null)
    if (!user || user.password === null) {
      return res.status(400).json({ message: 'Invalid credentials or user signed up with OAuth' });
    }

    // Compare provided password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Prepare user data to send back (excluding password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    };

    // Send back user data and JWT token
    res.json({
      ...userResponse,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Get Current User Details ---
export const getMe = async (req: AuthRequest, res: Response) => {
  // protect middleware ensures req.user exists
  if (!req.user) {
    // This should technically not happen if protect middleware is used correctly
    return res.status(401).json({ message: 'Not authorized' });
  }

  // Fetch user details from DB based on ID from token/session
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    // Select specific fields to return
    select: { id: true, name: true, email: true, avatarUrl: true }
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
      // Don't reveal if user exists - send same success message for security
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash Token (important for security)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set Token Expiry (e.g., 10 minutes)
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save Hashed Token and Expiry to User
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Create Reset URL
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`; // Send the *unhashed* token in the URL

    // Send Email
    const message = `You are receiving this email because you (or someone else) requested the reset of a password for your account.\nPlease click on the following link, or paste it into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\nThis link is valid for 10 minutes.`;

    await sendEmail({
      to: user.email,
      subject: 'Your WeManage Password Reset Token (Valid for 10 min)',
      text: message,
      // html: `<p>...</p>` // Optional HTML version
    });

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    // Attempt to clear token fields if an error occurred after finding the user
    try {
        await prisma.user.updateMany({
            where: { email }, // Only update if email matched initially
            data: { passwordResetToken: null, passwordResetExpires: null }
        });
    } catch (clearErr) {
        console.error("Error clearing token after forgotPassword failure:", clearErr);
    }
    res.status(500).json({ message: 'Error sending password reset email' });
  }
};

// --- Reset Password ---
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params; // Get token from URL parameter
  const { password } = req.body; // Get new password from request body

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  if (password.length < 6) { // Basic validation
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }


  // Hash the token from the URL to match the one stored in the DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  try {
    // Find user by the hashed token and check if the token hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() }, // Check expiry: must be greater than now
      },
    });

    // If no user found or token expired
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    // Hash the new password provided by the user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password in the database
    // Also clear the reset token fields so the token cannot be reused
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null, // Clear the token
        passwordResetExpires: null, // Clear expiry
      },
    });

    // Send success response
    res.json({ message: 'Password has been reset successfully.' });

  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

