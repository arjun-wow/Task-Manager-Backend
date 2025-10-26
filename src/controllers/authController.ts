import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const generateToken = (id: number) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ id }, jwtSecret, { expiresIn: '30d' });
};

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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`
      },
      select: { id: true, name: true, email: true, avatarUrl: true }
    });

    res.status(201).json({
      ...user,
      token: generateToken(user.id),
    });
  } catch (err) {
  console.error("--- THIS IS THE REGISTRATION ERROR ---");
  console.error(err);
  console.error("--- END OF REGISTRATION ERROR ---");
  res.status(500).json({ message: "Server error", error: err });
}
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    };

    res.json({
      ...userResponse,
      token: generateToken(user.id),
    });
 } catch (err) {
  console.error("REGISTRATION ERROR:", err); // <-- ADD THIS LINE
  res.status(500).json({ message: "Server error", error: err });
}
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true }
  });

  res.json(user);
};