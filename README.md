# Inventory Management API

A comprehensive Node.js/Express inventory management system with multi-business support, category organization, product tracking, and detailed inventory history.

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
- ✅ Real-time quantity management
- ✅ Inventory increment/decrement operations
- ✅ Detailed top-up history tracking
- ✅ Usage history and analytics
- ✅ Business-wide inventory oversight

## 📋 Prerequisites

- Node.js (v14+)
- MongoDB
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
# Database Configuration
DB=mongodb://localhost:27017/inventory_management

# JWT Security
JWT_SECRET=your_super_secret_jwt_key_256_bits_minimum

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Application Configuration
PORT=3000
NODE_ENV=development
```

### Gmail Setup for Email Verification

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the App Password in `EMAIL_PASS` (not your regular password)

### Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
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
│   ├── models/               # MongoDB schemas & data models
│   │   ├── business.model.js
│   │   ├── category.model.js
│   │   ├── inventory.model.js
│   │   ├── product.model.js
│   │   └── user.model.js
│   ├── routes/               # API endpoint definitions
│   │   ├── business.route.js
│   │   ├── category.route.js
│   │   ├── inventory.route.js
│   │   ├── product.route.js
│   │   └── user.route.js
│   ├── middleware/           # Authentication & validation middleware
│   │   ├── auth.middleware.js
│   │   ├── business.middleware.js
│   │   └── validation.middleware.js
│   ├── utils/                # Utility functions
│   │   ├── emailTemplate.js
│   │   └── verifyToken.js
│   └── database/             # Database connection
│       └── db.js
├── postman/                  # API testing collection
│   └── collection.json
├── app.js                    # Express app configuration
├── server.js                 # Server startup
├── package.json              # Dependencies & scripts
└── README.md                 # This documentation
```

### Data Flow Architecture

1. **Request Layer**: Routes define endpoints and apply middleware
2. **Controller Layer**: Handles HTTP requests/responses and input validation
3. **Service Layer**: Implements business logic and data operations
4. **Model Layer**: Defines data schemas and database interactions
5. **Database Layer**: MongoDB with Mongoose ODM

## 🔐 Authentication & Security

### JWT Authentication Flow

1. **Registration**: User registers → Email verification required
2. **Email Verification**: OTP-based verification (6-digit, 10min expiry)
3. **Login**: Email + Password → JWT token returned
4. **Protected Routes**: JWT token required in Authorization header

### Security Features

- **Password Security**: Bcrypt hashing (10 salt rounds)
- **Email Verification**: Mandatory OTP verification
- **Rate Limiting**: Prevents spam and abuse
- **Token Expiration**: Configurable JWT expiration
- **Role-Based Access**: User/Admin role separation
- **Input Validation**: Comprehensive request validation

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: String ['user', 'admin'],
  isActive: Boolean,
  isEmailVerified: Boolean,
  emailOTP: String,
  otpExpiry: Date,
  otpAttempts: Number,
  lastOTPSent: Date,
  resetToken: String,
  resetTokenExpiry: Date
}
```

### Business Model
```javascript
{
  name: String (unique),
  type: String,
  owner: ObjectId (User),
  isActive: Boolean,
  categories: [ObjectId] (Category),
  description: String,
  address: {
    street, city, state, zipCode, country
  },
  contactInfo: {
    email, phone, website
  }
}
```

### Category Model
```javascript
{
  name: String,
  business: ObjectId (Business),
  products: [ObjectId] (Product),
  isActive: Boolean,
  description: String
}
```

### Product Model
```javascript
{
  name: String,
  business: ObjectId (Business),
  category: ObjectId (Category),
  price: Number,
  quantity: Number,
  isAvailable: Boolean,
  description: String
}
```

### Inventory Models
```javascript
// TopUp History
{
  business: ObjectId,
  product: ObjectId,
  user: ObjectId,
  oldQuantity: Number,
  newQuantity: Number,
  quantityAdded: Number
}

// Usage History
{
  business: ObjectId,
  product: ObjectId,
  user: ObjectId,
  oldQuantity: Number,
  newQuantity: Number,
  quantityUsed: Number
}
```

## 🛣️ API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/register` | Register new user | No |
| POST | `/api/users/verify-email` | Verify email with OTP | No |
| POST | `/api/users/resend-otp` | Resend verification OTP | No |
| POST | `/api/users/login` | User login | No |
| POST | `/api/users/forgot/password` | Request password reset | No |
| POST | `/api/users/reset/password` | Reset password | No |
| POST | `/api/users/create/admin` | Create admin user | No |
| GET | `/api/users` | Get all users | Admin |

### Business Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/business/register` | Register business | User |
| GET | `/api/business` | Get businesses | User |
| PUT | `/api/business` | Update business | Owner |
| DELETE | `/api/business/:id` | Delete business | Owner |

### Category Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/categories` | Create category | Business Owner |
| GET | `/api/categories` | Get categories | Business Owner |
| PUT | `/api/categories` | Update category | Business Owner |
| DELETE | `/api/categories` | Delete category | Business Owner |

### Product Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/products` | Create product | Business Owner |
| GET | `/api/products` | Get products | Business Owner |
| PUT | `/api/products` | Update product | Business Owner |
| DELETE | `/api/products` | Delete product | Business Owner |

### Inventory Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/inventory/increment` | Add stock | Business Owner |
| POST | `/api/inventory/decrement` | Use/remove stock | Business Owner |
| GET | `/api/inventory/topup-history` | Get stock additions | Business Owner |
| GET | `/api/inventory/usage-history` | Get stock usage | Business Owner |

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
curl -X POST http://localhost:3000/api/business/register \
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
curl -X POST "http://localhost:3000/api/products?categoryId=CATEGORY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "iPhone 15",
    "price": 999,
    "quantity": 50,
    "description": "Latest iPhone model"
  }'
```

### 3. Inventory Management

```bash
# Add stock (increment)
curl -X POST "http://localhost:3000/api/inventory/increment?productId=PRODUCT_ID&userId=USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 25
  }'

# Use stock (decrement)
curl -X POST "http://localhost:3000/api/inventory/decrement?productId=PRODUCT_ID&userId=USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 5
  }'

# Get top-up history
curl -X GET "http://localhost:3000/api/inventory/topup-history?productId=PRODUCT_ID&userId=USER_ID&page=1&limit=10" \
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
- [ ] Inventory increment/decrement
- [ ] History tracking verification
- [ ] Role-based access control

## 🚀 Deployment

### Production Environment Setup

```env
# Production environment variables
NODE_ENV=production
DB=mongodb://your-production-db-url
JWT_SECRET=your-super-secure-256-bit-secret
EMAIL_USER=your-production-email@domain.com
EMAIL_PASS=your-production-email-password
PORT=3000
```

### Production Recommendations

1. **Database**: Use MongoDB Atlas or dedicated MongoDB instance
2. **Email Service**: Migrate to SendGrid, AWS SES, or similar service
3. **Security**: 
   - Use HTTPS/SSL certificates
   - Enable CORS properly
   - Implement rate limiting with Redis
4. **Monitoring**: Add comprehensive logging and error tracking
5. **Performance**: Enable database indexing and query optimization

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

## 🤝 Development Guidelines

### Code Structure Principles

1. **Separation of Concerns**: Controllers handle HTTP, Services handle business logic
2. **Error Handling**: Consistent error responses across all endpoints
3. **Validation**: Input validation at controller level
4. **Security**: Authentication middleware for protected routes
5. **Documentation**: Comprehensive inline documentation

### Adding New Features

1. Create model schema in `src/models/`
2. Implement service logic in `src/services/`
3. Create controller in `src/controllers/`
4. Define routes in `src/routes/`
5. Add middleware if needed
6. Update this documentation

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
- `403`: Forbidden
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

- OTP requests: 5 per hour per email/IP
- OTP verification attempts: 5 per code
- General API: Configurable per endpoint

### Security Configuration

- JWT expiration: Configurable (default: 24h)
- Password minimum length: 8 characters
- OTP expiry: 10 minutes
- Reset token expiry: 1 hour

## 📈 Performance Optimization

### Database Indexes

- User: email, resetToken, emailOTP
- Business: name, owner, isActive, type
- Category: name+business (unique), business+isActive
- Product: name+business (unique), business+category
- Inventory: business+product, business+user

### Query Optimization

- Pagination implemented across all list endpoints
- Selective field projection in queries
- Efficient aggregation pipelines for history tracking

## 🐛 Troubleshooting

### Common Issues

1. **Email not sending**: Check Gmail app password configuration
2. **JWT errors**: Verify JWT_SECRET is properly set
3. **Database connection**: Ensure MongoDB is running and accessible
4. **OTP not working**: Check system time synchronization

### Debug Mode

Set `NODE_ENV=development` for detailed error logging.

## 📚 API Documentation

For detailed API documentation with request/response examples, import the Postman collection or refer to the inline documentation in the controller files.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Follow existing code structure and documentation standards
4. Add tests for new functionality
5. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details

---

**Built with**: Node.js, Express.js, MongoDB, JWT, Nodemailer, Bcrypt