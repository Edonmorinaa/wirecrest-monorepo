# @wirecrest/db

<div align="center">
  <img src="../../apps/dashboard/public/logo/logo-single.svg" alt="Wirecrest Database" width="80" height="80">
  
  **Enterprise Database Layer & Schema Management**
  
  ![Prisma](https://img.shields.io/badge/Prisma-5.x-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
</div>

## 🎯 **Overview**

The `@wirecrest/db` package provides a comprehensive database layer for the Wirecrest platform. Built with Prisma ORM and PostgreSQL, it offers type-safe database operations, automated migrations, and enterprise-grade schema management for multi-tenant reputation management applications.

### **Key Features**

- 🗄️ **Type-Safe Database Access**: Full TypeScript support with Prisma Client
- 🏢 **Multi-Tenant Architecture**: Team-based data isolation and security
- 🔄 **Automated Migrations**: Version-controlled schema changes
- 📊 **Performance Optimized**: Efficient queries and indexing strategies
- 🛡️ **Data Security**: Row-level security and audit trails
- 🔧 **Developer Experience**: Rich tooling and debugging capabilities

## 🏗️ **Database Schema**

### **Core Entities**

#### **Users & Authentication**
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  image       String?
  superRole   SuperRole @default(USER)
  emailVerified DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  accounts    Account[]
  sessions    Session[]
  teamMembers TeamMember[]
  auditLogs   AuditLog[]
}
```

#### **Teams & Organizations**
```prisma
model Team {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  image       String?
  plan        PlanType @default(FREE)
  status      TeamStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  members     TeamMember[]
  businesses  Business[]
  integrations Integration[]
}
```

#### **Business Profiles**
```prisma
model Business {
  id          String   @id @default(cuid())
  teamId      String
  platform    PlatformType
  platformId  String
  name        String
  description String?
  address     String?
  phone       String?
  website     String?
  status      BusinessStatus @default(ACTIVE)
  
  // Relations
  team        Team     @relation(fields: [teamId], references: [id])
  reviews     Review[]
  analytics   Analytics[]
  
  @@unique([teamId, platform, platformId])
}
```

#### **Reviews & Feedback**
```prisma
model Review {
  id          String   @id @default(cuid())
  businessId  String
  platform    PlatformType
  platformReviewId String
  authorName  String
  authorImage String?
  rating      Float
  content     String?
  sentiment   SentimentType?
  language    String?
  publishedAt DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  business    Business @relation(fields: [businessId], references: [id])
  responses   ReviewResponse[]
  
  @@unique([businessId, platform, platformReviewId])
}
```

### **Platform Support**

| Platform | Business Profiles | Reviews | Analytics | Automation |
|----------|------------------|---------|-----------|------------|
| Google | ✅ | ✅ | ✅ | ✅ |
| Facebook | ✅ | ✅ | ✅ | ✅ |
| TripAdvisor | ✅ | ✅ | ✅ | ❌ |
| Booking | ✅ | ✅ | ✅ | ❌ |
| Yelp | ✅ | ✅ | ✅ | ❌ |
| Instagram | ✅ | ❌ | ✅ | ✅ |
| TikTok | ✅ | ❌ | ✅ | ✅ |

## 🚀 **Quick Start**

### **Installation**

```bash
# Install the package
yarn add @wirecrest/db

# Or with npm
npm install @wirecrest/db
```

### **Basic Usage**

```typescript
import { PrismaClient } from '@wirecrest/db';

// Initialize client
const prisma = new PrismaClient();

// Basic operations
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});

const teams = await prisma.team.findMany({
  where: { 
    members: { 
      some: { userId: user.id } 
    } 
  },
  include: {
    members: true,
    businesses: true
  }
});
```

### **Advanced Queries**

```typescript
// Complex analytics query
const teamAnalytics = await prisma.analytics.aggregate({
  where: {
    business: {
      teamId: 'team-id',
      status: 'ACTIVE'
    },
    date: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31')
    }
  },
  _avg: {
    rating: true,
    reviewCount: true
  },
  _sum: {
    reviewCount: true,
    responseCount: true
  }
});

// Multi-platform review aggregation
const reviewSummary = await prisma.review.groupBy({
  by: ['platform', 'sentiment'],
  where: {
    business: {
      teamId: 'team-id'
    },
    publishedAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  },
  _count: {
    id: true
  },
  _avg: {
    rating: true
  }
});
```

## ⚙️ **Environment Setup**

### **Database Connection**

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/wirecrest?schema=public"

# Optional: Direct database URL for migrations
DIRECT_URL="postgresql://username:password@localhost:5432/wirecrest"

# Environment
NODE_ENV="development"
```

### **Development Setup**

```bash
# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate dev

# Seed development data
yarn prisma db seed

# Open Prisma Studio
yarn prisma studio
```

### **Production Setup**

```bash
# Deploy migrations
yarn prisma migrate deploy

# Generate production client
yarn prisma generate --no-engine
```

## 🔧 **Available Scripts**

```bash
# Client Generation
yarn generate              # Generate Prisma client
yarn generate:watch        # Generate client in watch mode

# Migrations
yarn migrate:dev           # Create and apply migration (dev)
yarn migrate:deploy        # Apply migrations (production)
yarn migrate:status        # Check migration status
yarn migrate:reset         # Reset database and apply all migrations

# Database Operations
yarn db:seed               # Seed database with sample data
yarn db:studio             # Open Prisma Studio
yarn db:push               # Push schema changes (dev only)
yarn db:pull               # Pull schema from database

# Schema Management
yarn schema:validate       # Validate Prisma schema
yarn schema:format         # Format Prisma schema
yarn introspect            # Introspect existing database

# Utilities
yarn clean                 # Clean generated files
yarn reset                 # Reset and reseed database
yarn backup                # Create database backup
```

## 📊 **Schema Design Patterns**

### **Multi-Tenancy**

Every data model includes team-based isolation:

```prisma
model Business {
  id      String @id @default(cuid())
  teamId  String  // Tenant isolation
  // ... other fields
  
  team    Team @relation(fields: [teamId], references: [id])
  
  @@index([teamId]) // Performance optimization
}
```

### **Audit Trail**

All models include audit fields:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  teamId    String?
  action    String
  resource  String
  details   Json?
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())
  
  user      User @relation(fields: [userId], references: [id])
  
  @@index([userId, timestamp])
  @@index([teamId, timestamp])
}
```

### **Soft Deletes**

Critical entities support soft deletion:

```prisma
model Team {
  id        String     @id @default(cuid())
  status    TeamStatus @default(ACTIVE)
  deletedAt DateTime?
  
  // Soft delete filter
  @@map("teams")
}
```

### **Performance Optimization**

Strategic indexing for common queries:

```prisma
model Review {
  // ... fields
  
  @@index([businessId, publishedAt])
  @@index([platform, rating])
  @@index([sentiment, publishedAt])
  @@unique([businessId, platform, platformReviewId])
}
```

## 🛡️ **Security Features**

### **Row-Level Security**

Database-level security policies:

```sql
-- Team-based row-level security
CREATE POLICY team_isolation ON businesses
  FOR ALL TO authenticated_users
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = current_user_id()
  ));
```

### **Data Encryption**

Sensitive fields are encrypted at rest:

```prisma
model Integration {
  id          String @id @default(cuid())
  teamId      String
  platform    PlatformType
  credentials Json     // Encrypted JSON field
  
  @@map("integrations")
}
```

### **Input Validation**

Schema-level validation:

```prisma
model User {
  email    String @unique @db.VarChar(255)
  name     String? @db.VarChar(100)
  
  @@index([email])
}
```

## 📈 **Performance Optimization**

### **Query Optimization**

- **Selective Includes**: Only fetch needed relations
- **Pagination**: Cursor-based pagination for large datasets
- **Aggregations**: Database-level calculations
- **Indexing**: Strategic index placement

### **Connection Management**

```typescript
// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

// Connection lifecycle
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

### **Caching Strategy**

- **Query Result Caching**: Redis integration
- **Connection Pooling**: Optimized connection management
- **Prepared Statements**: Query plan reuse

## 🔍 **Advanced Features**

### **Custom Client Extensions**

```typescript
// Extended Prisma client with custom methods
const extendedPrisma = prisma.$extends({
  model: {
    team: {
      async findBySlug(slug: string) {
        return await prisma.team.findUnique({
          where: { slug },
          include: {
            members: {
              include: { user: true }
            },
            businesses: true
          }
        });
      },
      
      async getAnalyticsSummary(teamId: string, dateRange: DateRange) {
        // Custom analytics aggregation
        return await prisma.$queryRaw`
          SELECT 
            platform,
            COUNT(*) as total_reviews,
            AVG(rating) as avg_rating,
            COUNT(CASE WHEN sentiment = 'POSITIVE' THEN 1 END) as positive_reviews
          FROM reviews r
          JOIN businesses b ON r.business_id = b.id
          WHERE b.team_id = ${teamId}
            AND r.published_at BETWEEN ${dateRange.start} AND ${dateRange.end}
          GROUP BY platform
        `;
      }
    }
  }
});
```

### **Real-Time Subscriptions**

```typescript
// Database change streams
const subscription = prisma.$subscribe.review({
  create: {
    business: {
      teamId: 'team-id'
    }
  }
});

subscription.on('data', (data) => {
  console.log('New review:', data);
});
```

### **Transaction Management**

```typescript
// Complex multi-model transactions
await prisma.$transaction(async (tx) => {
  const business = await tx.business.create({
    data: businessData
  });
  
  const integration = await tx.integration.create({
    data: {
      teamId: business.teamId,
      platform: business.platform,
      credentials: encryptedCredentials
    }
  });
  
  await tx.auditLog.create({
    data: {
      userId,
      action: 'CREATE_BUSINESS',
      resource: 'business',
      details: { businessId: business.id }
    }
  });
  
  return { business, integration };
});
```

## 🧪 **Testing**

### **Test Database Setup**

```typescript
// Test database configuration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
});

// Test utilities
export const cleanDatabase = async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users, teams, businesses CASCADE`;
};

export const seedTestData = async () => {
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User'
    }
  });
  
  const team = await prisma.team.create({
    data: {
      name: 'Test Team',
      slug: 'test-team',
      members: {
        create: {
          userId: user.id,
          role: 'ADMIN'
        }
      }
    }
  });
  
  return { user, team };
};
```

### **Integration Testing**

```typescript
describe('Database Operations', () => {
  beforeEach(async () => {
    await cleanDatabase();
    await seedTestData();
  });
  
  test('should create business with reviews', async () => {
    const { team } = await seedTestData();
    
    const business = await prisma.business.create({
      data: {
        teamId: team.id,
        platform: 'GOOGLE',
        platformId: 'google-place-id',
        name: 'Test Business'
      }
    });
    
    const review = await prisma.review.create({
      data: {
        businessId: business.id,
        platform: 'GOOGLE',
        platformReviewId: 'google-review-id',
        authorName: 'John Doe',
        rating: 5.0,
        content: 'Great service!',
        publishedAt: new Date()
      }
    });
    
    expect(business.id).toBeDefined();
    expect(review.businessId).toBe(business.id);
  });
});
```

## 🚀 **Deployment**

### **Migration Strategy**

```bash
# Production migration workflow
1. Backup current database
2. Test migrations on staging
3. Deploy with zero-downtime strategy
4. Verify data integrity
5. Monitor performance
```

### **Environment Configuration**

```bash
# Production environment
DATABASE_URL="postgresql://user:password@prod-db:5432/wirecrest"
DIRECT_URL="postgresql://user:password@prod-db:5432/wirecrest"
SHADOW_DATABASE_URL="postgresql://user:password@shadow-db:5432/wirecrest_shadow"

# Performance tuning
PRISMA_CLIENT_ENGINE_TYPE="library"
PRISMA_QUERY_ENGINE_LIBRARY="native"
```

### **Monitoring & Observability**

```typescript
// Custom metrics collection
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
  }
});
```

## 📚 **API Reference**

### **Core Models**

| Model | Description | Key Relations |
|-------|-------------|---------------|
| `User` | Platform users | `TeamMember[]`, `AuditLog[]` |
| `Team` | Organizations/teams | `TeamMember[]`, `Business[]` |
| `Business` | Business profiles | `Team`, `Review[]`, `Analytics[]` |
| `Review` | Customer reviews | `Business`, `ReviewResponse[]` |
| `Analytics` | Performance metrics | `Business` |
| `Integration` | Platform integrations | `Team` |

### **Enums**

```typescript
enum PlatformType {
  GOOGLE = 'GOOGLE'
  FACEBOOK = 'FACEBOOK'
  TRIPADVISOR = 'TRIPADVISOR'
  BOOKING = 'BOOKING'
  YELP = 'YELP'
  INSTAGRAM = 'INSTAGRAM'
  TIKTOK = 'TIKTOK'
}

enum SentimentType {
  POSITIVE = 'POSITIVE'
  NEUTRAL = 'NEUTRAL'
  NEGATIVE = 'NEGATIVE'
}

enum TeamRole {
  ADMIN = 'ADMIN'
  MANAGER = 'MANAGER'
  MEMBER = 'MEMBER'
}
```

## 🤝 **Contributing**

See the main repository [Contributing Guide](../../CONTRIBUTING.md) for development guidelines.

### **Database Guidelines**

1. **Schema Changes**: Always create migrations for schema changes
2. **Performance**: Consider query performance when adding new fields
3. **Security**: Follow row-level security patterns
4. **Testing**: Include database tests for new models
5. **Documentation**: Update schema documentation

## 📄 **License**

This project is part of the Wirecrest platform and is licensed under the MIT License.

---

<div align="center">
  <p>🗄️ Built with Prisma, PostgreSQL, and enterprise database patterns</p>
  <p>
    <a href="../../README.md">← Back to Main Repository</a>
  </p>
</div>
