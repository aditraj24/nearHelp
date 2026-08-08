import dotenv from 'dotenv';
dotenv.config();
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import sosRoutes from './routes/sos.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import type { ApiError } from './utils/ApiError.js';
// Side-effect import: registers the Express/Socket.io type augmentations.
import './types/index.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', chatbotRoutes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'NearHelp API is running' });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = err as Partial<ApiError> & Error;
  const statusCode = apiError.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: apiError.message || 'Internal Server Error',
    errors: apiError.errors || []
  });
};

app.use(errorHandler);

export default app;
