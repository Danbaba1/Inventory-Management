# User Authentication API with OTP Email Verification

A complete Node.js/Express authentication system with email verification using One-Time Passwords (OTP).

## Features

- ✅ User registration with email verification
- ✅ OTP-based email verification (6-digit codes)
- ✅ JWT-based authentication
- ✅ Password reset with email links
- ✅ Admin user management
- ✅ Rate limiting and security measures
- ✅ Professional email templates
- ✅ Input validation and sanitization

## Quick Start

### Prerequisites

- Node.js (v14+)
- MongoDB
- Gmail account with App Password

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd your-project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/your-database

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_gmail_app_password

# App Configuration
BASE_URL=http://localhost:3000
PORT=3000
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the App Password (not your regular password) in `EMAIL_PASS`

### Running the Application

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication Flow

#### 1. Register User

```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "password": "password123"
}
```

#### 2. Verify Email (Required)

```http
POST /api/users/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### 3. Login

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Complete Endpoint List

| Method | Endpoint           | Description               | Auth Required |
| ------ | ------------------ | ------------------------- | ------------- |
| POST   | `/register`        | Register new user         | No            |
| POST   | `/verify-email`    | Verify email with OTP     | No            |
| POST   | `/resend-otp`      | Resend verification OTP   | No            |
| POST   | `/login`           | User login                | No            |
| POST   | `/forgot/password` | Request password reset    | No            |
| POST   | `/reset/password`  | Reset password with token | No            |
| POST   | `/create/admin`    | Create admin user         | No            |
| GET    | `/users`           | Get all users (paginated) | Admin         |

## Security Features

### Email Verification

- 6-digit OTP codes
- 10-minute expiration
- Maximum 5 verification attempts
- Rate limiting (1 min between requests)

### Password Security

- Bcrypt hashing with salt rounds: 10
- Minimum 8 characters
- Weak password detection
- Secure reset via email tokens

### Rate Limiting

- OTP requests: 5 per hour per email/IP
- OTP verification: 5 attempts per code
- Token-based request limiting

### Data Protection

- Sensitive fields excluded from responses
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Database Schema

### User Model

```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String,
  password: String (required, hashed),
  role: String (enum: ['user', 'admin']),
  isActive: Boolean (default: true),
  isEmailVerified: Boolean (default: false),
  emailOTP: String (6-digit code),
  otpExpiry: Date (10 minutes from generation),
  otpAttempts: Number (max 5),
  lastOTPSent: Date (for rate limiting),
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

### Manual Testing with cURL

```bash
# 1. Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"1234567890","email":"test@example.com","password":"testpass123"}'

# 2. Check email for OTP, then verify
curl -X POST http://localhost:3000/api/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# 3. Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Postman Collection

Import the provided Postman collection for comprehensive API testing with automated test scripts.

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error Type",
  "message": "Human readable message",
  "errors": ["Specific validation errors"] // Optional
}
```

## Email Templates

The system includes professional HTML email templates for:

- **Verification OTP** - Branded verification code delivery
- **Welcome Email** - Sent after successful verification
- **Password Reset** - Secure password reset links

## Deployment

### Environment Setup

- Set `NODE_ENV=production`
- Use secure JWT secrets (256-bit)
- Configure production email service (SendGrid, AWS SES)
- Set up Redis for rate limiting
- Enable HTTPS

### Production Recommendations

- Use Redis for session storage and rate limiting
- Implement comprehensive logging
- Add monitoring and alerting
- Use a dedicated email service provider
- Enable CORS properly
- Set up SSL/TLS certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
