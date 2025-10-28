# Wirecrest Dashboard

<div align="center">
  <img src="./public/logo/logo-single.svg" alt="Wirecrest Dashboard" width="80" height="80">
  
  **Enterprise Reputation Management Dashboard**
  
  ![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Material-UI](https://img.shields.io/badge/Material--UI-7.x-0081CB?style=for-the-badge&logo=mui&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-5.x-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
</div>

## 🎯 **Overview**

The Wirecrest Dashboard is a modern, responsive web application that provides businesses with comprehensive reputation management capabilities. Built with Next.js 15 and Material-UI v7, it offers real-time analytics, multi-platform monitoring, and intelligent automation tools for managing online presence across major platforms.

### **Key Features**

- 🏢 **Multi-Tenant Architecture**: Subdomain-based team isolation with secure data separation
- 📊 **Real-Time Analytics**: Live dashboards with interactive charts and metrics
- 🔍 **Review Management**: Monitor and respond to reviews across 7+ platforms
- 🤖 **Automation Engine**: AI-powered response suggestions and automated workflows
- 👥 **Team Collaboration**: Role-based access control and team management
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 🎨 **Customizable UI**: Themes, layouts, and personalization options

## 🏗️ **Architecture**

### **Subdomain Routing**
```
Main Domain:     wirecrest.com              # Landing and public pages
Admin Panel:     admin.wirecrest.com        # Super admin interface
Auth Domain:     auth.wirecrest.com         # Authentication flow
Team Domains:    [team-slug].wirecrest.com  # Team-specific dashboards
```

### **Tech Stack**

#### **Frontend Framework**
- **Next.js 15**: React framework with App Router and Server Components
- **TypeScript**: Strict type checking throughout the application
- **Material-UI v7**: Component library with custom theming system
- **React 19**: Latest React features with concurrent rendering

#### **State Management**
- **React Context**: Global state management for auth and teams
- **SWR**: Data fetching and caching with automatic revalidation
- **Server Components**: Reduced client-side JavaScript bundle

#### **Authentication & Security**
- **NextAuth.js v5**: Modern authentication with custom providers
- **Prisma Adapter**: Secure session and user management
- **RBAC**: Role-based access control with granular permissions

#### **Styling & UI**
- **CSS-in-JS**: Emotion styling with Material-UI theming
- **Responsive Design**: Mobile-first approach with breakpoint system
- **Dark/Light Themes**: Automatic theme switching with user preferences
- **Internationalization**: Multi-language support with i18next

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js** >= 20.0.0
- **Yarn** >= 4.0.0
- **PostgreSQL** database (local or cloud)

### **Installation**

1. **Navigate to dashboard directory**
   ```bash
   cd apps/dashboard
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables (see below)
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   yarn prisma generate
   
   # Run database migrations
   yarn prisma migrate deploy
   
   # Seed development data (optional)
   yarn prisma db seed
   ```

5. **Start development server**
   ```bash
   yarn dev
   ```

The dashboard will be available at `http://wirecrest.local:3032`

### **Local Development Setup**

For subdomain routing in development, add these entries to your `/etc/hosts` file:

```
127.0.0.1   wirecrest.local
127.0.0.1   admin.wirecrest.local
127.0.0.1   auth.wirecrest.local
127.0.0.1   demo.wirecrest.local
```

## ⚙️ **Environment Variables**

Create a `.env` file in the dashboard directory with the following variables:

### **Required Variables**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wirecrest"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://wirecrest.local:3032"

# Application
NEXT_PUBLIC_ROOT_DOMAIN="wirecrest.local:3032"
NODE_ENV="development"
```

### **Optional Variables**

```bash
# External Services
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Email Service (for notifications)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@wirecrest.com"

# Analytics & Monitoring
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
SENTRY_DSN="your-sentry-dsn"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_ENABLE_AUTOMATION="true"
NEXT_PUBLIC_ENABLE_NOTIFICATIONS="true"
```

## 📁 **Project Structure**

```
apps/dashboard/
├── public/                         # Static assets
│   ├── assets/                     # Images, icons, and media
│   ├── fonts/                      # Custom fonts
│   └── logo/                       # Brand assets
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── (home)/                 # Landing page group
│   │   ├── auth/                   # Authentication pages
│   │   ├── dashboard/              # Main dashboard pages
│   │   │   ├── superadmin/         # Super admin interface
│   │   │   ├── teams/              # Team management
│   │   │   └── [...catch-all]      # Dynamic routing
│   │   ├── api/                    # API routes
│   │   └── layout.tsx              # Root layout
│   ├── components/                 # Reusable UI components
│   │   ├── auth/                   # Authentication components
│   │   ├── dashboard/              # Dashboard-specific components
│   │   ├── forms/                  # Form components
│   │   ├── charts/                 # Data visualization
│   │   └── ui/                     # Base UI components
│   ├── sections/                   # Page-specific sections
│   │   ├── dashboard/              # Dashboard sections
│   │   ├── auth/                   # Auth flow sections
│   │   └── superadmin/             # Admin sections
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions and configurations
│   ├── types/                      # TypeScript type definitions
│   ├── contexts/                   # React Context providers
│   ├── middleware.ts               # Next.js middleware for routing
│   └── global.css                  # Global styles
├── package.json                    # Dependencies and scripts
├── next.config.mjs                 # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
└── tailwind.config.js              # Tailwind CSS configuration
```

## 🎨 **Features & Components**

### **Dashboard Features**

#### **Analytics Dashboard**
- Real-time metrics and KPIs
- Interactive charts with ApexCharts
- Platform-specific performance insights
- Customizable date ranges and filters

#### **Review Management**
- Unified inbox for all platform reviews
- AI-powered sentiment analysis
- Automated response suggestions
- Review rating and categorization

#### **Team Management**
- Multi-tenant architecture with team isolation
- Role-based permissions (Admin, Manager, Member)
- Team invitation and onboarding flow
- Activity logging and audit trails

#### **Automation Engine**
- Scheduled monitoring and alerts
- Custom automation workflows
- Integration with external services
- Performance tracking and optimization

### **UI Components**

#### **Layout System**
- Responsive sidebar navigation
- Breadcrumb navigation
- Quick actions toolbar
- Notification center

#### **Data Display**
- Advanced data tables with sorting/filtering
- Interactive charts and graphs
- KPI cards with trend indicators
- Real-time status indicators

#### **Forms & Input**
- Multi-step forms with validation
- Drag & drop file uploads
- Rich text editors
- Advanced date/time pickers

## 🔧 **Available Scripts**

```bash
# Development
yarn dev                    # Start development server (port 3032)
yarn dev:turbo             # Start with Turbopack (faster builds)

# Building
yarn build                  # Build for production
yarn start                  # Start production server

# Code Quality
yarn lint                   # Run ESLint
yarn lint:fix              # Fix ESLint errors automatically
yarn type-check            # Run TypeScript checks
yarn format                # Format code with Prettier

# Database
yarn prisma:generate        # Generate Prisma client
yarn prisma:studio          # Open Prisma Studio
yarn prisma:migrate         # Run database migrations
yarn prisma:reset           # Reset database and reseed

# Testing
yarn test                   # Run tests
yarn test:watch            # Run tests in watch mode
yarn test:coverage         # Generate coverage report

# Utilities
yarn clean                  # Clean build artifacts
yarn analyze               # Analyze bundle size
```

## 🛣️ **Routing & Navigation**

### **Subdomain-Based Routing**

The dashboard uses Next.js middleware to handle subdomain-based routing:

#### **Main Domain** (`wirecrest.local:3032`)
- `/` - Landing page
- `/auth/*` - Redirects to auth subdomain
- `/dashboard/*` - Blocked (redirects to appropriate subdomain)

#### **Admin Subdomain** (`admin.wirecrest.local:3032`)
- `/` - Super admin dashboard
- `/tenants` - Tenant management
- `/users` - User management
- `/analytics` - Platform analytics

#### **Auth Subdomain** (`auth.wirecrest.local:3032`)
- `/auth/sign-in` - Login page
- `/sign-up` - Registration page
- `/forgot-password` - Password reset

#### **Team Subdomains** (`[team-slug].wirecrest.local:3032`)
- `/` - Team dashboard
- `/reviews` - Review management
- `/analytics` - Team analytics
- `/settings` - Team settings

### **Navigation Guards**

- **Authentication**: Redirects unauthenticated users to auth domain
- **Authorization**: Role-based route protection
- **Team Access**: Automatic team context detection
- **Subdomain Validation**: Validates team slugs and reserved domains

## 🎨 **Theming & Customization**

### **Material-UI Theming**

The dashboard uses a custom Material-UI theme with:

- **Color Palette**: Primary, secondary, and semantic colors
- **Typography**: Custom font families and sizing scales
- **Components**: Styled component overrides
- **Dark/Light Modes**: Automatic theme switching

### **Responsive Design**

Breakpoints and responsive behavior:

```typescript
// Breakpoints
xs: 0px      // Mobile phones
sm: 600px    // Tablets
md: 900px    # Small laptops
lg: 1200px   # Desktop
xl: 1536px   # Large screens
```

### **Customization Options**

- **User Preferences**: Theme, language, dashboard layout
- **Team Branding**: Custom logos, colors, and styling
- **Dashboard Widgets**: Configurable dashboard components
- **Notification Settings**: Granular notification preferences

## 🔐 **Security & Authentication**

### **Authentication Flow**

1. **User Access**: User visits team subdomain
2. **Auth Check**: Middleware checks authentication status
3. **Redirect**: Unauthenticated users → auth subdomain
4. **Login**: User authenticates via NextAuth.js
5. **Redirect Back**: Authenticated users → original destination

### **Authorization System**

#### **User Roles**
- **Super Admin**: Platform administration access
- **Team Admin**: Full team management capabilities
- **Team Manager**: Limited administrative functions
- **Team Member**: Basic dashboard access

#### **Permissions**
- **Team Access**: User can access specific teams
- **Feature Access**: Role-based feature availability
- **Data Access**: Row-level security for team data

### **Security Features**

- **CSRF Protection**: Built-in CSRF token validation
- **XSS Prevention**: Input sanitization and CSP headers
- **Session Management**: Secure JWT-based sessions
- **Rate Limiting**: API endpoint protection
- **Audit Logging**: Comprehensive activity tracking

## 📊 **Performance & Optimization**

### **Next.js Optimizations**

- **App Router**: Modern routing with Server Components
- **Image Optimization**: Automatic image resizing and formats
- **Font Optimization**: Preloaded custom fonts
- **Bundle Analysis**: Code splitting and tree shaking

### **Loading & Caching**

- **SWR**: Client-side caching with automatic revalidation
- **Static Generation**: Pre-rendered pages where possible
- **Edge Caching**: CDN integration for static assets
- **Database Optimization**: Efficient Prisma queries

### **Performance Monitoring**

- **Core Web Vitals**: Built-in performance metrics
- **Error Tracking**: Comprehensive error monitoring
- **Analytics**: User behavior and performance insights
- **Health Checks**: Application health monitoring

## 🧪 **Testing**

### **Testing Strategy**

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API route and database testing
- **E2E Tests**: Full user journey testing
- **Visual Regression**: UI consistency testing

### **Testing Tools**

- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **MSW**: API mocking for tests

## 🚀 **Deployment**

### **Production Build**

```bash
# Build for production
yarn build

# Start production server
yarn start
```

### **Environment Setup**

1. **Database**: Configure production PostgreSQL instance
2. **Authentication**: Set up OAuth providers and secrets
3. **DNS**: Configure subdomain routing
4. **SSL**: Set up certificates for all subdomains

### **Docker Deployment**

```dockerfile
# Production Dockerfile included
FROM node:20-alpine AS base
# ... (see Dockerfile for complete configuration)
```

### **Vercel Deployment**

The dashboard is optimized for Vercel deployment:

- **Automatic Builds**: Connected to Git repository
- **Environment Variables**: Configured in Vercel dashboard
- **Domain Configuration**: Custom domain setup
- **Edge Functions**: Optimized middleware execution

## 📚 **API Integration**

### **Internal APIs**

The dashboard integrates with:

- **Scraper Service**: Data extraction and analytics
- **Auth Service**: Authentication and user management
- **Email Service**: Notification and communication

### **External Integrations**

- **Google APIs**: Google My Business, Places API
- **Facebook APIs**: Facebook Business, Instagram API
- **Review Platforms**: TripAdvisor, Booking.com APIs
- **Analytics**: Google Analytics, custom tracking

## 🤝 **Contributing**

See the main repository [Contributing Guide](../../CONTRIBUTING.md) for development guidelines.

### **Dashboard-Specific Guidelines**

1. **Component Development**: Follow Material-UI patterns
2. **Routing**: Use App Router conventions
3. **State Management**: Prefer Server Components when possible
4. **Styling**: Use theme-based styling with Material-UI
5. **Testing**: Include tests for new components and features

## 📄 **License**

This project is part of the Wirecrest platform and is licensed under the MIT License.

---

<div align="center">
  <p>🎨 Built with Next.js, Material-UI, and modern web technologies</p>
  <p>
    <a href="../../README.md">← Back to Main Repository</a>
  </p>
</div>