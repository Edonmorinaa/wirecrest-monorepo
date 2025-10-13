import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createAuthRoutes } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Express application setup following clean architecture principles
 * Separates concerns: routing, middleware, and error handling
 */
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://*.wirecrest.com',
    'https://www.wirecrest.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3032',
    'http://auth.wirecrest.local:3032'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(cookieParser());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

// Authentication routes
app.use('/', createAuthRoutes());

// Global error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Auth service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
