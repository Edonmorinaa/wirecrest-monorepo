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

// CORS configuration with proper wildcard support
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like curl, mobile apps, or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow any localhost origin with any port
    if (origin.startsWith('http://localhost:') || origin === 'http://localhost') {
      return callback(null, true);
    }
    
    // Allow wirecrest.local with any subdomain and port (dev environment)
    if (origin.match(/^https?:\/\/[^\/]+\.wirecrest\.local(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow wirecrest.com with any subdomain (production)
    if (origin.match(/^https:\/\/[^\/]+\.wirecrest\.com$/)) {
      return callback(null, true);
    }
    
    // Allow main domain
    if (origin === 'https://www.wirecrest.com' || origin === 'https://wirecrest.com') {
      return callback(null, true);
    }
    
    console.log(`❌ CORS blocked origin: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));

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
