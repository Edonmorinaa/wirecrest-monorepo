# Wirecrest

<div align="center">
  <img src="./apps/dashboard/public/logo/logo-single.svg" alt="Wirecrest Logo" width="120" height="120">
  
  **Enterprise-Grade Reputation Management Platform**
  
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
</div>

## 🎯 **Overview**

Wirecrest is a comprehensive, enterprise-grade reputation management platform that helps businesses monitor, analyze, and improve their online presence across multiple platforms. Built with modern technologies and following SOLID principles, Wirecrest provides real-time analytics, automated reputation monitoring, and intelligent insights for businesses of all sizes.

### **Key Capabilities**

- 🏢 **Multi-Platform Support**: Google, Facebook, TripAdvisor, Booking.com, Yelp, Instagram, TikTok
- 📊 **Real-Time Analytics**: Advanced metrics and performance insights
- 🤖 **Intelligent Automation**: AI-powered response suggestions and monitoring
- 🎨 **Modern Dashboard**: Intuitive, responsive web interface
- 🔐 **Enterprise Security**: Role-based access control and secure authentication
- 📱 **Multi-Tenant Architecture**: Subdomain-based team isolation
- 🚀 **Scalable Infrastructure**: Microservices architecture with Docker support

## 🏗️ **Architecture**

Wirecrest follows a modern microservices architecture with clear separation of concerns:

```
Wirecrest/
├── apps/                           # Application services
│   ├── dashboard/                  # Next.js frontend application
│   ├── scraper/                    # Data extraction and analytics service
│   └── auth-service/               # Authentication microservice
├── packages/                       # Shared libraries
│   ├── core/                       # Business logic and utilities
│   ├── auth/                       # Authentication utilities
│   ├── email/                      # Email service components
│   └── db/                         # Database schema and client
└── docs/                          # Documentation
```

### **Technology Stack**

#### **Frontend**
- **Framework**: Next.js 15 with App Router
- **Styling**: Material-UI (MUI) v7 with custom theming
- **State Management**: React Context + SWR for data fetching
- **TypeScript**: Strict type checking throughout

#### **Backend**
- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with custom providers
- **APIs**: RESTful endpoints with comprehensive error handling

#### **Infrastructure**
- **Containerization**: Docker with multi-stage builds
- **Package Management**: Yarn workspaces for monorepo
- **CI/CD**: GitHub Actions (ready for deployment)
- **Monitoring**: Built-in health checks and performance metrics

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js** >= 20.0.0
- **Yarn** >= 4.0.0
- **PostgreSQL** >= 14
- **Docker** (optional, for containerized deployment)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/wirecrest.git
   cd wirecrest
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment setup**
   ```bash
   # Copy environment templates
   cp apps/dashboard/.env.example apps/dashboard/.env
   cp apps/scraper/.env.example apps/scraper/.env
   cp apps/auth-service/.env.example apps/auth-service/.env
   
   # Configure your environment variables
   # See individual app READMEs for specific configuration
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   cd packages/db
   yarn prisma generate
   
   # Run migrations
   yarn prisma migrate deploy
   ```

5. **Start development servers**
   ```bash
   # Start all services in development mode
   yarn dev
   
   # Or start individual services
   yarn workspace wirecrest-dashboard dev      # Dashboard on :3032
   yarn workspace wirecrest-scraper dev        # Scraper API on :3001
   yarn workspace @wirecrest/auth-service dev  # Auth service on :3033
   ```

### **Access Points**

- **Main Dashboard**: http://wirecrest.local:3032
- **Admin Panel**: http://admin.wirecrest.local:3032
- **Authentication**: http://auth.wirecrest.local:3033
- **API Documentation**: http://localhost:3001/docs

## 📦 **Applications & Services**

### **Dashboard** (`apps/dashboard`)
The main web application providing the user interface for reputation management.

- **Technology**: Next.js 15 with TypeScript
- **Features**: Multi-tenant dashboard, real-time analytics, team management
- **Port**: 3032
- [📖 Full Documentation](./apps/dashboard/README.md)

### **Scraper Service** (`apps/scraper`)
High-performance data extraction and analytics engine.

- **Technology**: Node.js with TypeScript, following SOLID principles
- **Features**: Multi-platform data extraction, real-time analytics, automated monitoring
- **Port**: 3001
- [📖 Full Documentation](./apps/scraper/README.md)

### **Auth Service** (`apps/auth-service`)
Dedicated authentication and authorization microservice.

- **Technology**: Node.js with Express and TypeScript
- **Features**: JWT-based authentication, role management, session handling
- **Port**: 3033
- [📖 Full Documentation](./apps/auth-service/README.md)

## 📚 **Shared Packages**

### **Core** (`packages/core`)
Business logic, types, and utilities shared across all applications.

- **Platform configurations** for supported services
- **Business validation** rules and metrics
- **TypeScript interfaces** and type definitions
- [📖 Full Documentation](./packages/core/README.md)

### **Auth** (`packages/auth`)
Authentication utilities and components for React applications.

- **NextAuth.js configuration** and providers
- **React hooks** for authentication state
- **Middleware** for route protection
- [📖 Full Documentation](./packages/auth/README.md)

### **Email** (`packages/email`)
Email service components and templates.

- **React Email templates** for transactional emails
- **Email sending utilities** with multiple providers
- **Template management** system
- [📖 Full Documentation](./packages/email/README.md)

### **Database** (`packages/db`)
Database schema, migrations, and client configuration.

- **Prisma schema** definitions
- **Database migrations** and seeding
- **Type-safe client** with custom extensions
- [📖 Full Documentation](./packages/db/README.md)

## 🔧 **Development**

### **Available Scripts**

```bash
# Development
yarn dev                    # Start all services in development mode
yarn build                  # Build all applications and packages
yarn lint                   # Run ESLint across all workspaces
yarn type-check            # Run TypeScript type checking
yarn clean                  # Clean all build artifacts

# Individual workspace commands
yarn workspace <workspace-name> <command>
```

### **Code Quality**

- **ESLint**: Consistent code style and best practices
- **TypeScript**: Strict type checking with `strict: true`
- **Prettier**: Code formatting (configured in individual packages)
- **Husky**: Pre-commit hooks for quality assurance

### **Architecture Principles**

- **SOLID Principles**: All services follow SOLID design principles
- **Clean Architecture**: Clear separation between layers
- **Dependency Injection**: Modular and testable components
- **TypeScript First**: Type safety throughout the codebase

## 🚢 **Deployment**

### **Production Deployment**

#### **Docker Deployment**
```bash
# Build all services
docker-compose build

# Start in production mode
docker-compose up -d
```

#### **Manual Deployment**
```bash
# Build all applications
yarn build

# Start production servers
yarn workspace wirecrest-dashboard start
yarn workspace wirecrest-scraper start
yarn workspace @wirecrest/auth-service start
```

### **Environment Configuration**

Each application requires specific environment variables. See individual README files for detailed configuration:

- [Dashboard Environment](./apps/dashboard/README.md#environment-variables)
- [Scraper Environment](./apps/scraper/README.md#environment-variables)
- [Auth Service Environment](./apps/auth-service/README.md#environment-variables)

## 🔐 **Security**

- **Environment Variables**: All secrets managed through environment variables
- **Authentication**: JWT-based with NextAuth.js v5
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encrypted communication and secure data handling
- **Audit Logging**: Comprehensive activity logging

## 📊 **Monitoring & Analytics**

- **Health Checks**: Built-in health endpoints for all services
- **Performance Metrics**: Real-time performance monitoring
- **Error Tracking**: Comprehensive error logging and reporting
- **Usage Analytics**: Platform usage insights and trends

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### **Development Workflow**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `yarn test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [docs.wirecrest.com](https://docs.wirecrest.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/wirecrest/issues)
- **Community**: [Discord Server](https://discord.gg/wirecrest)
- **Email**: support@wirecrest.com

---

<div align="center">
  <p>Built with ❤️ by the Wirecrest Team</p>
  <p>
    <a href="https://wirecrest.com">Website</a> •
    <a href="https://docs.wirecrest.com">Documentation</a> •
    <a href="https://github.com/your-org/wirecrest/issues">Issues</a> •
    <a href="https://discord.gg/wirecrest">Community</a>
  </p>
</div>
