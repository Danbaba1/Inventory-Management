# Inventory Management API

A comprehensive Node.js/Express inventory management system with multi-business support, category organization, product tracking, and detailed inventory history using PostgreSQL/Supabase backend.

## 🚀 Features

### User Management

- ✅ User registration with email verification (OTP-based)
- ✅ JWT-based authentication & authorization
- ✅ Password reset with secure email tokens
- ✅ Admin user management with role-based access
- ✅ Rate limiting and security measures

### Business Management

- ✅ Multi-business support per user
- ✅ Business registration and profile management
- ✅ Business-specific categorization and products
- ✅ Owner-based access control

### Category Management

- ✅ Hierarchical category organization
- ✅ Business-specific categories
- ✅ Category-based product grouping

### Product Management

- ✅ Comprehensive product catalog
- ✅ Price and quantity tracking
- ✅ Category association
- ✅ Product availability management

### Inventory Tracking

- ✅ Real-time quantity management with atomic operations
- ✅ Inventory increment/decrement operations using stored procedures
- ✅ Detailed transaction history tracking (TOP_UP/USAGE)
- ✅ Business-wide inventory oversight with category organization
- ✅ Complete audit trail with user attribution

## 📋 Prerequisites

- Node.js (v18+)
- Supabase account and project
- Gmail account with App Password (for email verification)

## ⚡ Quick Start

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd inventory-management

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT Security
JWT_SECRET=your_super_secret_jwt_key_256_bits_minimum

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Application Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and service role key from Settings → API
3. Set up the required database tables and stored procedures
4. Configure Row Level Security (RLS) policies if needed

### Gmail Setup for Email Verification

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the App Password in `EMAIL_PASS` (not your regular password)

### Running the Application

```bash
# Development mode
npm start

# Run database migrations (if available)
npm run migrate

# Validate migration (if available)
npm run validate-migration
```

## 🏗️ Architecture Overview

### Project Structure

```
inventory-management/
├── src/
│   ├── controllers/          # Request handlers & business logic orchestration
│   │   ├── business.controller.js
│   │   ├── category.controller.js
│   │   ├── inventory.controller.js
│   │   ├── product.controller.js
│   │   └── user.controller.js
│   ├── services/             # Core business logic & data operations
│   │   ├── business.service.js
│   │   ├── category.service.js
│   │   ├── inventory.service.js
│   │   ├── product.service.js
│   │   └── user.service.js
│   ├── routes/               # API endpoint definitions
│   │   ├── business.route.js
│   │   ├── category.route.js
│   │   ├── inventory.route.js
│   │   ├── product.route.js
│   │   └── user.route.js
│   ├── middleware/           # Authentication & validation middleware
│   │   └── auth.middleware.js
│   ├── config/               # Configuration files
│   │   └── supabase.js
│   └── utils/                # Utility functions
│       └── emailTemplate.js
|   |__ validation/           # Validation middleware
|       |__ validation.middleware.js
├── scripts/                  # Database migration scripts
├── postman/                  # API testing collection
├── app.js                    # Express app configuration
├── server.js                 # Server startup
├── package.json              # Dependencies & scripts
└── README.md                 # This documentation
```

### Data Flow Architecture

1. **Request Layer**: Routes define endpoints and apply middleware
2. **Controller Layer**: Handles HTTP requests/responses and input validation
3. **Service Layer**: Implements business logic and data operations
4. **Database Layer**: PostgreSQL via Supabase with stored procedures

### Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT tokens
- **Email**: Nodemailer with Gmail
- **Security**: Bcrypt password hashing
- **API Client**: Supabase JavaScript client

## 🔐 Authentication & Security

### JWT Authentication Flow

1. **Registration**: User registers → Email verification required
2. **Email Verification**: OTP-based verification (6-digit, 10min expiry)
3. **Login**: Email + Password → JWT token returned
4. **Protected Routes**: JWT token required in Authorization header

### Security Features

- **Password Security**: Bcrypt hashing (10 salt rounds)
- **Email Verification**: Mandatory OTP verification
- **Rate Limiting**: Prevents spam and abuse (1 OTP per minute)
- **Token Expiration**: Configurable JWT expiration (24h default)
- **Role-Based Access**: User/Admin role separation
- **Input Validation**: Comprehensive request validation
- **Business Ownership Validation**: All operations check user permissions

## 📊 Database Schema (PostgreSQL)

### Core Tables

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  password VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_otp VARCHAR,
  otp_expiry TIMESTAMPTZ,
  otp_attempts INTEGER DEFAULT 0,
  last_otp_sent TIMESTAMPTZ,
  reset_token VARCHAR,
  reset_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Businesses Table

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,
  type VARCHAR NOT NULL,
  description TEXT,
  address JSONB,
  contact_info JSONB,
  owner_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  business_id UUID REFERENCES businesses(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, business_id)
);
```

#### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  business_id UUID REFERENCES businesses(id),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, business_id)
);
```

#### Inventory Transactions Table

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  transaction_type VARCHAR NOT NULL, -- 'TOP_UP' or 'USAGE'
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  quantity_changed INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stored Procedures

The system uses stored procedures for atomic inventory operations:

- `increment_product_quantity()`: Atomically increases product quantity and logs transaction
- `decrement_product_quantity()`: Atomically decreases product quantity and logs transaction

## 🛣️ API Endpoints

### Authentication Endpoints

| Method | Endpoint                     | Description               | Auth Required |
| ------ | ---------------------------- | ------------------------- | ------------- |
| POST   | `/api/users/register`        | Register new user         | No            |
| POST   | `/api/users/verify-email`    | Verify email with OTP     | No            |
| POST   | `/api/users/resend-otp`      | Resend verification OTP   | No            |
| POST   | `/api/users/login`           | User login                | No            |
| POST   | `/api/users/forgot-password` | Request password reset    | No            |
| POST   | `/api/users/reset-password`  | Reset password with token | No            |
| POST   | `/api/users/create-admin`    | Create admin user         | No            |
| GET    | `/api/users`                 | Get all users             | Admin         |

### Business Management

| Method | Endpoint                   | Description       | Auth Required |
| ------ | -------------------------- | ----------------- | ------------- |
| POST   | `/api/businesses/register` | Register business | User          |
| GET    | `/api/businesses`          | Get businesses    | User          |
| PATCH  | `/api/businesses/:id`      | Update business   | Owner         |
| DELETE | `/api/businesses/:id`      | Delete business   | Owner         |

### Category Management

| Method | Endpoint              | Description     | Auth Required  |
| ------ | --------------------- | --------------- | -------------- |
| POST   | `/api/categories`     | Create category | Business Owner |
| GET    | `/api/categories`     | Get categories  | Business Owner |
| PATCH  | `/api/categories/:id` | Update category | Business Owner |
| DELETE | `/api/categories/:id` | Delete category | Business Owner |

### Product Management

| Method | Endpoint            | Description        | Auth Required  |
| ------ | ------------------- | ------------------ | -------------- |
| POST   | `/api/products`     | Create product     | Business Owner |
| GET    | `/api/products`     | Get products       | Business Owner |
| GET    | `/api/products/:id` | Get single product | Business Owner |
| PATCH  | `/api/products/:id` | Update product     | Business Owner |
| DELETE | `/api/products/:id` | Delete product     | Business Owner |

### Inventory Management

| Method | Endpoint                              | Description                    | Auth Required  |
| ------ | ------------------------------------- | ------------------------------ | -------------- |
| POST   | `/api/inventory/:productId/increment` | Add stock                      | Business Owner |
| POST   | `/api/inventory/:productId/decrement` | Remove stock                   | Business Owner |
| GET    | `/api/inventory/:productId/history`   | Get product inventory history  | Business Owner |
| GET    | `/api/inventory/business/history`     | Get business inventory history | Business Owner |

## 📝 API Usage Examples

### 1. Complete Registration Flow

```bash
# Step 1: Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "password": "securepass123"
  }'

# Step 2: Verify email (check email for OTP)
curl -X POST http://localhost:3000/api/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'

# Step 3: Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 2. Business Setup Flow

```bash
# Register business (requires JWT token)
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Tech Store",
    "type": "Electronics",
    "description": "Electronics and gadgets store"
  }'

# Create category
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Smartphones",
    "description": "Mobile phones and accessories"
  }'

# Create product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "iPhone 15",
    "categoryId": "CATEGORY_UUID",
    "price": 999,
    "quantity": 50,
    "description": "Latest iPhone model"
  }'
```

### 3. Inventory Management

```bash
# Add stock (increment)
curl -X POST http://localhost:3000/api/inventory/PRODUCT_UUID/increment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 25,
    "reason": "New stock arrival"
  }'

# Use stock (decrement)
curl -X POST http://localhost:3000/api/inventory/PRODUCT_UUID/decrement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 5,
    "reason": "Sale"
  }'

# Get product inventory history
curl -X GET "http://localhost:3000/api/inventory/PRODUCT_UUID/history?page=1&limit=10&transactionType=TOP_UP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get business-wide inventory history
curl -X GET "http://localhost:3000/api/inventory/business/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing

### Manual Testing with cURL

Use the examples above or import the Postman collection from `postman/collection.json`.

### Postman Collection

1. Import `postman/collection.json` into Postman
2. Set up environment variables:
   - `base_url`: http://localhost:3000
   - `jwt_token`: (obtained from login)
3. Run the collection tests in sequence

### Testing Checklist

- [ ] User registration and email verification
- [ ] Login and JWT token generation
- [ ] Password reset flow
- [ ] Business registration and management
- [ ] Category CRUD operations
- [ ] Product CRUD operations
- [ ] Inventory increment/decrement with atomic operations
- [ ] History tracking verification with transaction types
- [ ] Role-based access control
- [ ] Business ownership validation

## 🚀 Deployment

### Production Environment Setup

```env
# Production environment variables
NODE_ENV=production
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-key
JWT_SECRET=your-super-secure-256-bit-secret
EMAIL_USER=your-production-email@domain.com
EMAIL_PASS=your-production-email-password
BASE_URL=https://your-production-domain.com
PORT=3000
```

### Production Recommendations

1. **Database**: Use Supabase Pro or dedicated PostgreSQL instance
2. **Email Service**: Migrate to SendGrid, AWS SES, or similar service
3. **Security**:
   - Use HTTPS/SSL certificates
   - Enable CORS properly
   - Implement additional rate limiting
   - Configure Supabase RLS policies
4. **Monitoring**: Add comprehensive logging and error tracking
5. **Performance**: Enable database indexing and connection pooling

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose with Supabase

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    depends_on:
      - db

  db:
    # Use Supabase or external PostgreSQL
    # This is just for local development
    image: postgres:15
    environment:
      POSTGRES_DB: inventory_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🤝 Development Guidelines

### Code Structure Principles

1. **Separation of Concerns**: Controllers handle HTTP, Services handle business logic
2. **Error Handling**: Consistent error responses across all endpoints
3. **Validation**: Input validation at controller level
4. **Security**: Authentication middleware and business ownership validation
5. **Documentation**: Comprehensive inline documentation
6. **Atomic Operations**: Use stored procedures for critical inventory operations

### Adding New Features

1. Design database schema changes in Supabase
2. Create/update stored procedures if needed
3. Implement service logic in `src/services/`
4. Create controller in `src/controllers/`
5. Define routes in `src/routes/`
6. Add middleware if needed
7. Update this documentation
8. Test with Postman collection

## 📄 Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human readable error message"
}
```

### HTTP Status Codes Used

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resources)
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error
- `503`: Service Unavailable

## 📧 Email Templates

Professional HTML email templates included:

- **OTP Verification**: Branded 6-digit code delivery
- **Welcome Email**: Post-verification greeting
- **Password Reset**: Secure reset link delivery

## 🔧 Configuration

### Rate Limiting Configuration

- OTP requests: 1 minute cooldown between requests
- OTP verification attempts: 5 per code generation
- General API: Configurable per endpoint

### Security Configuration

- JWT expiration: 24 hours (configurable)
- Password minimum length: 8 characters
- OTP expiry: 10 minutes
- Reset token expiry: 1 hour
- Service key usage: Server-side only

## 📈 Performance Optimization

### Database Optimization

- **Indexes**: Proper indexing on frequently queried columns
- **Stored Procedures**: Atomic operations for inventory management
- **Connection Pooling**: Supabase handles connection management
- **Query Optimization**: Efficient joins and selective field projection

### Application Optimization

- Pagination implemented across all list endpoints
- Selective field projection in queries
- Efficient relationship loading with Supabase joins
- Atomic inventory operations prevent race conditions

## 🐛 Troubleshooting

### Common Issues

1. **Supabase connection issues**:

   - Verify SUPABASE_URL and SUPABASE_SERVICE_KEY
   - Check network connectivity and firewall settings
   - Ensure service key has proper permissions

2. **Email not sending**:

   - Check Gmail app password configuration
   - Verify EMAIL_USER and EMAIL_PASS environment variables
   - Check Gmail security settings

3. **JWT errors**:

   - Verify JWT_SECRET is properly set and consistent
   - Check token expiration times
   - Ensure proper token format in Authorization header

4. **Database query errors**:
   - Check Supabase table structure matches expectations
   - Verify RLS policies if enabled
   - Check for proper UUID format in requests

### Debug Mode

Set `NODE_ENV=development` for detailed error logging and stack traces.

### Supabase Debugging

1. Use Supabase dashboard to monitor real-time database activity
2. Check Supabase logs for database errors
3. Verify API keys and permissions
4. Use Supabase SQL editor for direct database queries

## 📚 API Documentation

For detailed API documentation with request/response examples, import the Postman collection or refer to the inline documentation in the controller and service files.

## 🔄 Migration from MongoDB

If migrating from a MongoDB-based system:

1. Use the provided migration scripts in the `scripts/` directory
2. Run `npm run migrate` to execute database migration
3. Run `npm run validate-migration` to verify data integrity
4. Update environment variables to use Supabase configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Follow existing code structure and documentation standards
4. Add tests for new functionality
5. Ensure Supabase schema changes are documented
6. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details

---

**Built with**: Node.js, Express.js, PostgreSQL, Supabase, JWT, Nodemailer, Bcrypt
