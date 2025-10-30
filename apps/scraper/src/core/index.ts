// import * as express from 'express';
// import * as cors from 'cors';
// import { Request, Response } from 'express';
// import { MarketPlatform } from '@prisma/client';

// // Import new SOLID-compliant architecture
// import { ServiceFactory } from './container/ServiceFactory';
// import { BusinessApiController } from './api/controllers/BusinessApiController';
// import { ReviewApiController } from './api/controllers/ReviewApiController';
// import { AnalyticsApiController } from './api/controllers/AnalyticsApiController';
// import { TaskApiController } from './api/controllers/TaskApiController';
// import { HealthCheckResponse, TaskStatusResponse } from './api/dto/ApiResponse';

// /**
//  * Modern SOLID-Compliant API Server
//  * Follows Single Responsibility Principle (SRP) - each class has one reason to change
//  * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
//  * Follows Liskov Substitution Principle (LSP) - derived classes are substitutable for base classes
//  * Follows Interface Segregation Principle (ISP) - clients depend only on interfaces they use
//  * Follows Dependency Inversion Principle (DIP) - depends on abstractions, not concretions
//  */

// const app: express.Application = express();
// const PORT = parseInt(process.env.PORT || '3001', 10);

// // Middleware
// app.use(cors());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Initialize service factory and dependency injection
// let serviceFactory: ServiceFactory;
// let businessController: BusinessApiController;
// let reviewController: ReviewApiController;
// let analyticsController: AnalyticsApiController;
// let taskController: TaskApiController;

// /**
//  * Initialize services
//  * Follows Dependency Inversion Principle (DIP) - depends on abstractions
//  */
// async function initializeServices(): Promise<void> {
//   try {
//     console.log('🔧 Initializing SOLID-compliant services...');
    
//     // Initialize service factory
//     serviceFactory = new ServiceFactory();
//     const container = serviceFactory.getContainer();
    
//     // Initialize controllers with dependency injection
//     businessController = new BusinessApiController(container);
//     reviewController = new ReviewApiController(container);
//     analyticsController = new AnalyticsApiController(container);
//     taskController = new TaskApiController(container);
    
//     console.log('✅ SOLID-compliant services initialized successfully');
//   } catch (error) {
//     console.error('❌ Failed to initialize services:', error);
//     throw error;
//   }
// }

// // =================== HEALTH CHECK ENDPOINTS ===================

// /**
//  * Health check endpoint - Railway-friendly
//  * Follows Single Responsibility Principle (SRP) - only handles health checks
//  */
// app.get('/health', (_req: Request, res: Response) => {
//   try {
//     const servicesStatus = {
//       serviceFactory: serviceFactory ? 'ready' : 'initializing',
//       businessController: businessController ? 'ready' : 'initializing',
//       reviewController: reviewController ? 'ready' : 'initializing',
//       analyticsController: analyticsController ? 'ready' : 'initializing'
//     };
    
//     const allServicesReady = serviceFactory && businessController && reviewController && analyticsController;
    
//     const response: HealthCheckResponse = {
//       success: true,
//       status: allServicesReady ? 'healthy' : 'starting',
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       environment: process.env.NODE_ENV || 'development',
//       port: PORT,
//       services: servicesStatus,
//       message: allServicesReady ? 'All SOLID-compliant services running' : 'Services are starting up'
//     };
    
//     res.status(200).json(response);
//   } catch (error) {
//     const response: HealthCheckResponse = {
//       success: false,
//       status: 'error',
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       environment: process.env.NODE_ENV || 'development',
//       port: PORT,
//       error: error instanceof Error ? error.message : 'Unknown error',
//       message: 'Service running but with errors'
//     };
    
//     res.status(200).json(response);
//   }
// });

// // =================== GOOGLE BUSINESS ENDPOINTS ===================

// /**
//  * Google business profile endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/google/profile', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.GOOGLE_MAPS;
//   await businessController.handleRequest(req, res);
// });

// app.get('/api/google/:teamId', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.GOOGLE_MAPS;
//   await businessController.handleRequest(req, res);
// });

// app.put('/api/google/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.GOOGLE_MAPS;
//   await businessController.handleRequest(req, res);
// });

// app.delete('/api/google/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.GOOGLE_MAPS;
//   await businessController.handleRequest(req, res);
// });

// /**
//  * Google reviews endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/google/reviews', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.GOOGLE_MAPS;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/google/:teamId/reviews', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.GOOGLE_MAPS;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/google/:teamId/analytics', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.GOOGLE_MAPS;
//   await analyticsController.handleRequest(req, res);
// });

// // =================== FACEBOOK BUSINESS ENDPOINTS ===================

// /**
//  * Facebook business profile endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/facebook/profile', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.FACEBOOK;
//   await businessController.handleRequest(req, res);
// });

// app.get('/api/facebook/:teamId', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.FACEBOOK;
//   await businessController.handleRequest(req, res);
// });

// app.put('/api/facebook/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.FACEBOOK;
//   await businessController.handleRequest(req, res);
// });

// app.delete('/api/facebook/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.FACEBOOK;
//   await businessController.handleRequest(req, res);
// });

// /**
//  * Facebook reviews endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/facebook/reviews', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.FACEBOOK;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/facebook/:teamId/reviews', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.FACEBOOK;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/facebook/:teamId/analytics', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.FACEBOOK;
//   await analyticsController.handleRequest(req, res);
// });

// // =================== TRIPADVISOR BUSINESS ENDPOINTS ===================

// /**
//  * TripAdvisor business profile endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/tripadvisor/profile', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.TRIPADVISOR;
//   await businessController.handleRequest(req, res);
// });

// app.get('/api/tripadvisor/:teamId', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.TRIPADVISOR;
//   await businessController.handleRequest(req, res);
// });

// app.put('/api/tripadvisor/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.TRIPADVISOR;
//   await businessController.handleRequest(req, res);
// });

// app.delete('/api/tripadvisor/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.TRIPADVISOR;
//   await businessController.handleRequest(req, res);
// });

// /**
//  * TripAdvisor reviews endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/tripadvisor/reviews', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.TRIPADVISOR;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/tripadvisor/:teamId/reviews', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.TRIPADVISOR;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/tripadvisor/:teamId/analytics', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.TRIPADVISOR;
//   await analyticsController.handleRequest(req, res);
// });

// // =================== BOOKING BUSINESS ENDPOINTS ===================

// /**
//  * Booking business profile endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/booking/profile', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.BOOKING;
//   await businessController.handleRequest(req, res);
// });

// app.get('/api/booking/:teamId', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.BOOKING;
//   await businessController.handleRequest(req, res);
// });

// app.put('/api/booking/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.BOOKING;
//   await businessController.handleRequest(req, res);
// });

// app.delete('/api/booking/:teamId', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.BOOKING;
//   await businessController.handleRequest(req, res);
// });

// /**
//  * Booking reviews endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to appropriate controller
//  */
// app.post('/api/booking/reviews', async (req: Request, res: Response) => {
//   req.body.platform = MarketPlatform.BOOKING;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/booking/:teamId/reviews', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.BOOKING;
//   await reviewController.handleRequest(req, res);
// });

// app.get('/api/booking/:teamId/analytics', async (req: Request, res: Response) => {
//   req.query.platform = MarketPlatform.BOOKING;
//   await analyticsController.handleRequest(req, res);
// });

// // =================== TASK TRACKING ENDPOINTS ===================

// /**
//  * Task tracking endpoints
//  * Follows Single Responsibility Principle (SRP) - delegates to TaskApiController
//  */
// app.get('/api/tasks/:teamId/:platform', async (req: Request, res: Response) => {
//   await taskController.handleRequest(req, res);
// });

// app.post('/api/tasks/:teamId/:platform', async (req: Request, res: Response) => {
//   await taskController.handleRequest(req, res);
// });

// app.put('/api/tasks/:teamId/:platform', async (req: Request, res: Response) => {
//   await taskController.handleRequest(req, res);
// });

// app.delete('/api/tasks/:teamId/:platform', async (req: Request, res: Response) => {
//   await taskController.handleRequest(req, res);
// });

// // =================== SERVER STARTUP ===================

// /**
//  * Start the server
//  * Follows Single Responsibility Principle (SRP) - only handles server startup
//  */
// async function startServer(): Promise<void> {
//   console.log('🎬 Starting Wirecrest Scraper Worker API (SOLID Architecture)...');
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`🚪 Port: ${PORT}`);
//   console.log(`📦 Node version: ${process.version}`);
  
//   try {
//     console.log('🔧 Initializing SOLID-compliant services...');
//     await initializeServices();
//     console.log('✅ SOLID-compliant services initialization complete');
    
//     app.listen(PORT, '0.0.0.0', () => {
//       console.log('🎯 ===============================================');
//       console.log(`🚀 Wirecrest Scraper Worker API v2.0 (SOLID Architecture)`);
//       console.log(`📡 Server running on http://0.0.0.0:${PORT}`);
//       console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
//       console.log('🎯 ===============================================\n');
      
//       console.log('📋 Available endpoints:');
//       console.log(`📊 Health check: GET http://localhost:${PORT}/health`);
//       console.log(`📈 Memory stats: GET http://localhost:${PORT}/memory-stats`);
//       console.log('');
//       console.log('📋 Task tracking endpoints:');
//       console.log(`📊 Get task: GET http://localhost:${PORT}/api/tasks/:teamId/:platform`);
//       console.log(`➕ Create task: POST http://localhost:${PORT}/api/tasks/:teamId/:platform`);
//       console.log(`🔄 Update task: PUT http://localhost:${PORT}/api/tasks/:teamId/:platform`);
//       console.log(`🗑️  Delete task: DELETE http://localhost:${PORT}/api/tasks/:teamId/:platform`);
//       console.log('');
//       console.log('🟢 Google endpoints:');
//       console.log(`🏢 Profile: POST http://localhost:${PORT}/api/google/profile`);
//       console.log(`🔍 Reviews: POST http://localhost:${PORT}/api/google/reviews`);
//       console.log(`📋 Get profile: GET http://localhost:${PORT}/api/google/:teamId`);
//       console.log(`📝 Get reviews: GET http://localhost:${PORT}/api/google/:teamId/reviews`);
//       console.log(`📊 Analytics: GET http://localhost:${PORT}/api/google/:teamId/analytics`);
//       console.log('');
//       console.log('🔵 Facebook endpoints:');
//       console.log(`🏢 Profile: POST http://localhost:${PORT}/api/facebook/profile`);
//       console.log(`🔍 Reviews: POST http://localhost:${PORT}/api/facebook/reviews`);
//       console.log(`📋 Get profile: GET http://localhost:${PORT}/api/facebook/:teamId`);
//       console.log(`📝 Get reviews: GET http://localhost:${PORT}/api/facebook/:teamId/reviews`);
//       console.log(`📊 Analytics: GET http://localhost:${PORT}/api/facebook/:teamId/analytics`);
//       console.log('');
//       console.log('🟠 TripAdvisor endpoints:');
//       console.log(`🏢 Profile: POST http://localhost:${PORT}/api/tripadvisor/profile`);
//       console.log(`🔍 Reviews: POST http://localhost:${PORT}/api/tripadvisor/reviews`);
//       console.log(`📋 Get profile: GET http://localhost:${PORT}/api/tripadvisor/:teamId`);
//       console.log(`📝 Get reviews: GET http://localhost:${PORT}/api/tripadvisor/:teamId/reviews`);
//       console.log(`📊 Analytics: GET http://localhost:${PORT}/api/tripadvisor/:teamId/analytics`);
//       console.log('');
//       console.log('🏨 Booking.com endpoints:');
//       console.log(`🏢 Profile: POST http://localhost:${PORT}/api/booking/profile`);
//       console.log(`🔍 Reviews: POST http://localhost:${PORT}/api/booking/reviews`);
//       console.log(`📋 Get profile: GET http://localhost:${PORT}/api/booking/:teamId`);
//       console.log(`📝 Get reviews: GET http://localhost:${PORT}/api/booking/:teamId/reviews`);
//       console.log(`📊 Analytics: GET http://localhost:${PORT}/api/booking/:teamId/analytics`);
//       console.log('');
//       console.log('✨ Architecture: SOLID Principles Applied');
//       console.log('🔧 Dependency Injection: Enabled');
//       console.log('🏗️  Repository Pattern: Implemented');
//       console.log('🎯 Service Layer: SOLID-Compliant');
//       console.log('📡 API Controllers: Segregated Interfaces');
//       console.log('');
//     });
    
//   } catch (error) {
//     console.error('❌ Failed to start server:', error);
//     process.exit(1);
//   }
// }

// // Start the server
// startServer();

// export default app;