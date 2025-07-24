import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import campusAuthRoutes from './routes/campus-auth';
import userRoutes from './routes/user';
import graphRoutes from './routes/graph';
import businessRoutes from './routes/business';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_auth';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/ui/auth', authRoutes);
app.use('/ui/campus-auth', campusAuthRoutes);
app.use('/ui/user', userRoutes);
app.use('/ui/graph', graphRoutes);
app.use('/ui/business', businessRoutes);
app.use('/ui/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'nodejs-auth' });
});

app.listen(PORT, () => {
  console.log(`Node.js auth service running on port ${PORT}`);
});