import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import passport from 'passport';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import './config/passport';

// --- Import routes ---
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import userRoutes from './routes/userRoutes';
import commentRoutes from './routes/commentRoutes';

// --- Validate critical env vars ---
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET missing');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET missing');
  process.exit(1);
}

const app = express();

// --- CORS ---


const allowedOrigins = [
  "https://wemanage.vercel.app",
  "https://wemanage-backend.onrender.com",
  "http://localhost:5173",
];

// Allow any Vercel preview deployment
const dynamicVercelRegex = /^https:\/\/wemanage-[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      dynamicVercelRegex.test(origin)
    ) {
      callback(null, true);
    } else {
      console.error("🚫 Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// --- Body Parser ---
app.use(bodyParser.json());

// --- Session ---
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// --- Passport ---
app.use(passport.initialize());
app.use(passport.session());

// --- Health ---
app.get('/', (_req, res) => res.send('✅ Task Manager Backend is running'));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', commentRoutes);

// --- Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV}`);
  console.log(` Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(` Loaded from: ${path.resolve(__dirname, '../.env')}`);
});
