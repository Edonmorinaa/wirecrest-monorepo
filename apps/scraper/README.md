# Wirecrest Scraper Service

<div align="center">
  <img src="../dashboard/public/logo/logo-single.svg" alt="Wirecrest Scraper" width="80" height="80">
  
  **High-Performance Data Extraction & Analytics Engine**
  
  ![Node.js](https://img.shields.io/badge/Node.js-20.x-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-5.x-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
</div>

## 🎯 **Overview**

The Wirecrest Scraper Service is a high-performance, enterprise-grade data extraction and analytics engine built with SOLID principles. It provides real-time data collection, processing, and analytics for reputation management across multiple platforms including Google, Facebook, TripAdvisor, Booking.com, Yelp, Instagram, and TikTok.

### **Key Features**

- 🚀 **High Performance**: Concurrent data processing with optimized algorithms
- 🏗️ **SOLID Architecture**: Clean, maintainable, and extensible codebase
- 📊 **Real-Time Analytics**: Live data processing and metric calculation
- 🔄 **Multi-Platform Support**: Unified API for 7+ major platforms
- 🛡️ **Enterprise Security**: Robust error handling and data validation
- 📈 **Scalable Design**: Microservices architecture with Docker support
- 🔍 **Advanced Monitoring**: Comprehensive logging and health checks

## 🏗️ **Architecture**

### **SOLID Principles Implementation**

The scraper service follows strict SOLID design principles:

#### **Single Responsibility Principle (SRP)**
- **Controllers**: Handle HTTP requests and responses only
- **Services**: Contain business logic for specific domains
- **Repositories**: Manage data access and persistence
- **Validators**: Handle input validation and sanitization

#### **Open/Closed Principle (OCP)**
- **Platform Extensions**: Easy to add new platforms without modifying existing code
- **Service Interfaces**: Extensible service definitions
- **Plugin Architecture**: Modular component system

#### **Liskov Substitution Principle (LSP)**
- **Repository Interfaces**: Interchangeable repository implementations
- **Service Abstractions**: Consistent service behavior across implementations

#### **Interface Segregation Principle (ISP)**
- **Focused Interfaces**: Small, specific interface definitions
- **Service Contracts**: Clear separation of concerns

#### **Dependency Inversion Principle (DIP)**
- **Dependency Injection**: Services depend on abstractions, not concretions
- **Container Pattern**: Centralized dependency management

### **Service Structure**

```
apps/scraper/
├── src/
│   ├── controllers/                # HTTP request handlers
│   │   ├── business.controller.ts  # Business profile operations
│   │   ├── review.controller.ts    # Review data operations
│   │   └── analytics.controller.ts # Analytics and metrics
│   ├── services/                   # Business logic layer
│   │   ├── business/              # Business profile services
│   │   ├── review/                # Review processing services
│   │   ├── analytics/             # Analytics calculation services
│   │   └── platform/              # Platform-specific services
│   ├── repositories/              # Data access layer
│   │   ├── interfaces/            # Repository contracts
│   │   ├── prisma/                # Prisma implementations
│   │   └── cache/                 # Caching layer
│   ├── types/                     # TypeScript definitions
│   ├── utils/                     # Utility functions
│   ├── middleware/                # Express middleware
│   └── core/                      # Core infrastructure
└── docs/                          # API documentation
```

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js** >= 20.0.0
- **TypeScript** >= 5.0.0
- **PostgreSQL** >= 14.0.0
- **Redis** (optional, for caching)

### **Installation**

1. **Navigate to scraper directory**
   ```bash
   cd apps/scraper
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   yarn prisma generate
   
   # Run migrations
   yarn prisma migrate deploy
   ```

5. **Start development server**
   ```bash
   yarn dev
   ```

The scraper service will be available at `http://localhost:3001`

## ⚙️ **Environment Variables**

### **Required Variables**

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/wirecrest"

# Application Configuration
NODE_ENV="development"
PORT=3001
API_VERSION="v1"

# Security
JWT_SECRET="your-jwt-secret-here"
API_RATE_LIMIT="100"  # Requests per minute
```

### **Platform API Keys**

```bash
# Google APIs
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
GOOGLE_MY_BUSINESS_API_KEY="your-gmb-api-key"

# Facebook APIs
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_ACCESS_TOKEN="your-facebook-access-token"

# TripAdvisor API
TRIPADVISOR_API_KEY="your-tripadvisor-api-key"

# Booking.com API
BOOKING_API_KEY="your-booking-api-key"

# Yelp API
YELP_API_KEY="your-yelp-api-key"

# Instagram API
INSTAGRAM_ACCESS_TOKEN="your-instagram-access-token"

# TikTok API
TIKTOK_CLIENT_KEY="your-tiktok-client-key"
TIKTOK_CLIENT_SECRET="your-tiktok-client-secret"
```

### **Optional Variables**

```bash
# Redis Cache
REDIS_URL="redis://localhost:6379"
CACHE_TTL="3600"  # Cache time-to-live in seconds

# Monitoring & Logging
LOG_LEVEL="info"  # debug, info, warn, error
ENABLE_METRICS="true"
SENTRY_DSN="your-sentry-dsn"

# Performance
MAX_CONCURRENT_REQUESTS="10"
REQUEST_TIMEOUT="30000"  # 30 seconds
BATCH_SIZE="50"
```

## 📁 **Project Structure**

```
apps/scraper/
├── src/
│   ├── controllers/                # Request handlers
│   │   ├── business/
│   │   │   ├── business.controller.ts
│   │   │   └── business.validation.ts
│   │   ├── review/
│   │   │   ├── review.controller.ts
│   │   │   └── review.validation.ts
│   │   └── analytics/
│   │       ├── analytics.controller.ts
│   │       └── analytics.validation.ts
│   ├── services/                   # Business logic
│   │   ├── business/
│   │   │   ├── business.service.ts
│   │   │   ├── profile.service.ts
│   │   │   └── validation.service.ts
│   │   ├── review/
│   │   │   ├── review.service.ts
│   │   │   ├── sentiment.service.ts
│   │   │   └── aggregation.service.ts
│   │   ├── analytics/
│   │   │   ├── metrics.service.ts
│   │   │   ├── reporting.service.ts
│   │   │   └── trends.service.ts
│   │   └── platform/
│   │       ├── google/
│   │       ├── facebook/
│   │       ├── tripadvisor/
│   │       ├── booking/
│   │       ├── yelp/
│   │       ├── instagram/
│   │       └── tiktok/
│   ├── repositories/               # Data access
│   │   ├── interfaces/
│   │   │   ├── business.repository.ts
│   │   │   ├── review.repository.ts
│   │   │   └── analytics.repository.ts
│   │   ├── prisma/
│   │   │   ├── business.repository.ts
│   │   │   ├── review.repository.ts
│   │   │   └── analytics.repository.ts
│   │   └── cache/
│   │       ├── redis.repository.ts
│   │       └── memory.repository.ts
│   ├── types/                      # Type definitions
│   │   ├── api.types.ts
│   │   ├── business.types.ts
│   │   ├── review.types.ts
│   │   └── platform.types.ts
│   ├── utils/                      # Utilities
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   ├── transformers.ts
│   │   └── helpers.ts
│   ├── middleware/                 # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts
│   ├── core/                       # Core infrastructure
│   │   ├── container.ts            # Dependency injection
│   │   ├── server.ts               # Express server setup
│   │   └── database.ts             # Database connection
│   └── index.ts                    # Application entry point
├── tests/                          # Test suites
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   ├── architecture/               # Architecture diagrams
│   └── deployment/                 # Deployment guides
├── scripts/                        # Utility scripts
│   ├── setup.ts                    # Environment setup
│   ├── migrate.ts                  # Database migrations
│   └── seed.ts                     # Data seeding
├── Dockerfile                      # Container configuration
├── docker-compose.yml              # Multi-service setup
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

## 🔧 **Available Scripts**

```bash
# Development
yarn dev                    # Start development server with hot reload
yarn dev:debug             # Start with Node.js debugger
yarn watch                  # Watch mode with automatic restart

# Building
yarn build                  # Compile TypeScript to JavaScript
yarn start                  # Start production server

# Database
yarn prisma:generate        # Generate Prisma client
yarn prisma:migrate         # Run database migrations
yarn prisma:studio          # Open Prisma Studio
yarn prisma:reset           # Reset database and reseed

# Testing
yarn test                   # Run all tests
yarn test:unit              # Run unit tests only
yarn test:integration       # Run integration tests only
yarn test:e2e              # Run end-to-end tests
yarn test:coverage         # Generate test coverage report

# Code Quality
yarn lint                   # Run ESLint
yarn lint:fix              # Fix ESLint errors automatically
yarn type-check            # Run TypeScript type checking
yarn format                # Format code with Prettier

# Documentation
yarn docs:generate          # Generate API documentation
yarn docs:serve            # Serve documentation locally

# Utilities
yarn clean                  # Clean build artifacts
yarn deps:check            # Check for dependency updates
yarn deps:update           # Update dependencies
```

## 🌐 **API Endpoints**

### **Health & Status**

```http
GET    /health              # Health check endpoint
GET    /metrics             # Performance metrics
GET    /status              # Service status and uptime
```

### **Business Operations**

```http
GET    /api/v1/business/:teamId/:platform           # Get business profile
POST   /api/v1/business/:teamId/:platform           # Create/update business profile
PUT    /api/v1/business/:teamId/:platform           # Update business profile
DELETE /api/v1/business/:teamId/:platform           # Delete business profile
```

### **Review Operations**

```http
GET    /api/v1/reviews/:teamId/:platform            # Get reviews
POST   /api/v1/reviews/:teamId/:platform/sync       # Sync reviews from platform
GET    /api/v1/reviews/:teamId/:platform/summary    # Get review summary
POST   /api/v1/reviews/:teamId/:platform/respond    # Respond to review
```

### **Analytics Operations**

```http
GET    /api/v1/analytics/:teamId/:platform          # Get analytics data
POST   /api/v1/analytics/:teamId/:platform/compute  # Compute analytics
GET    /api/v1/analytics/:teamId/summary            # Get multi-platform summary
GET    /api/v1/analytics/:teamId/trends             # Get trend analysis
```

### **Task Management**

```http
GET    /api/v1/tasks/:teamId/:platform              # Get task status
POST   /api/v1/tasks/:teamId/:platform              # Create new task
PUT    /api/v1/tasks/:teamId/:platform              # Update task
DELETE /api/v1/tasks/:teamId/:platform              # Cancel task
```

## 📊 **Platform Support**

### **Supported Platforms**

| Platform | Business Profile | Reviews | Analytics | Automation |
|----------|------------------|---------|-----------|------------|
| **Google** | ✅ | ✅ | ✅ | ✅ |
| **Facebook** | ✅ | ✅ | ✅ | ✅ |
| **TripAdvisor** | ✅ | ✅ | ✅ | ❌ |
| **Booking.com** | ✅ | ✅ | ✅ | ❌ |
| **Yelp** | ✅ | ✅ | ✅ | ❌ |
| **Instagram** | ✅ | ❌ | ✅ | ✅ |
| **TikTok** | ✅ | ❌ | ✅ | ✅ |

### **Platform-Specific Features**

#### **Google**
- **Business Profile**: Google My Business integration
- **Reviews**: Places API and My Business API
- **Analytics**: Performance insights and metrics
- **Automation**: Review response automation

#### **Facebook**
- **Business Profile**: Facebook Business API
- **Reviews**: Facebook Graph API
- **Analytics**: Facebook Insights
- **Automation**: Automated posting and responses

#### **TripAdvisor**
- **Business Profile**: TripAdvisor Content API
- **Reviews**: Review collection and analysis
- **Analytics**: Performance metrics and trends

#### **Booking.com**
- **Business Profile**: Booking.com Partner API
- **Reviews**: Guest review collection
- **Analytics**: Booking performance metrics

## 🔍 **Data Processing**

### **Review Processing Pipeline**

1. **Collection**: Fetch reviews from platform APIs
2. **Validation**: Validate and sanitize review data
3. **Sentiment Analysis**: Analyze review sentiment using AI
4. **Categorization**: Classify reviews by topics and themes
5. **Storage**: Store processed data in database
6. **Analytics**: Generate insights and metrics

### **Business Profile Processing**

1. **Profile Sync**: Synchronize business information
2. **Image Processing**: Download and optimize images
3. **Contact Validation**: Verify contact information
4. **Location Data**: Process address and location data
5. **Hours Processing**: Parse and validate operating hours

### **Analytics Computation**

1. **Metric Calculation**: Compute key performance indicators
2. **Trend Analysis**: Analyze historical data trends
3. **Comparative Analysis**: Compare against benchmarks
4. **Report Generation**: Generate automated reports
5. **Alert Processing**: Process threshold-based alerts

## 🛡️ **Security & Validation**

### **Input Validation**

- **Schema Validation**: Joi-based request validation
- **Data Sanitization**: XSS and injection prevention
- **Rate Limiting**: API endpoint protection
- **Authentication**: JWT-based authentication

### **Error Handling**

- **Graceful Degradation**: Fallback mechanisms for API failures
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breaker**: Protection against cascading failures
- **Comprehensive Logging**: Detailed error tracking

### **Data Security**

- **Encryption**: Data encryption at rest and in transit
- **Access Control**: Role-based data access
- **Audit Logging**: Comprehensive activity tracking
- **GDPR Compliance**: Data privacy and protection

## 📈 **Performance & Monitoring**

### **Performance Optimization**

- **Concurrent Processing**: Parallel API requests
- **Caching Strategy**: Redis-based caching layer
- **Database Optimization**: Efficient query patterns
- **Resource Pooling**: Connection and resource management

### **Monitoring Features**

- **Health Checks**: Service health monitoring
- **Metrics Collection**: Performance metrics tracking
- **Error Tracking**: Comprehensive error monitoring
- **Alerting**: Threshold-based alerts and notifications

### **Scalability**

- **Horizontal Scaling**: Multi-instance deployment
- **Load Balancing**: Request distribution
- **Database Scaling**: Read replica support
- **Microservices**: Independent service scaling

## 🧪 **Testing**

### **Testing Strategy**

- **Unit Tests**: Service and utility function testing
- **Integration Tests**: API endpoint and database testing
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Load and stress testing

### **Testing Tools**

- **Jest**: JavaScript testing framework
- **Supertest**: HTTP endpoint testing
- **Prisma Test**: Database testing utilities
- **Artillery**: Load testing framework

## 🚀 **Deployment**

### **Docker Deployment**

```bash
# Build Docker image
docker build -t wirecrest-scraper .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="your-database-url" \
  -e NODE_ENV="production" \
  wirecrest-scraper
```

### **Docker Compose**

```yaml
# Complete multi-service setup
version: '3.8'
services:
  scraper:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
```

### **Production Configuration**

- **Process Management**: PM2 or similar process manager
- **Reverse Proxy**: Nginx for load balancing
- **SSL Termination**: HTTPS certificate management
- **Monitoring**: Application performance monitoring

## 📚 **API Documentation**

Comprehensive API documentation is available at:

- **Development**: http://localhost:3001/docs
- **Swagger UI**: Interactive API explorer
- **Postman Collection**: Pre-configured API requests
- **OpenAPI Spec**: Machine-readable API specification

## 🤝 **Contributing**

See the main repository [Contributing Guide](../../CONTRIBUTING.md) for development guidelines.

### **Scraper-Specific Guidelines**

1. **SOLID Principles**: Follow established architectural patterns
2. **Interface Design**: Define clear service contracts
3. **Error Handling**: Implement comprehensive error handling
4. **Testing**: Include unit and integration tests
5. **Documentation**: Document new APIs and features

## 📄 **License**

This project is part of the Wirecrest platform and is licensed under the MIT License.

---

<div align="center">
  <p>⚡ Built with Node.js, TypeScript, and SOLID architecture principles</p>
  <p>
    <a href="../../README.md">← Back to Main Repository</a>
  </p>
</div>
