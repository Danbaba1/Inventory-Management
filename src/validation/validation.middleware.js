class ValidationMiddleware {
  /**
   * Validates user registration input data
   * 
   * Validates: name (2-50 chars), email format, phone format, password strength
   * Sanitizes: trims whitespace, normalizes email to lowercase
   * Blocks: common weak passwords, invalid formats
   * 
   * @param {Object} req - Express request object with body containing {name, phone, password, email}
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * Usage: router.post('/register', ValidationMiddleware.validateRegistration, controller)
   */
  static validateRegistration(req, res, next) {
    const { name, phone, password, email } = req.body;
    const errors = [];

    // Name validation - required, 2-50 characters
    if (!name || name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }
    if (name && name.length > 50) {
      errors.push("Name cannot exceed 50 characters");
    }

    // Email validation - required, valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push("Please provide a valid email address");
    }

    // Phone validation - international format, 1-16 digits
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
      errors.push("Please provide a valid phone number");
    }

    // Password validation - length and strength checks
    if (!password || password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (password && password.length > 128) {
      errors.push("Password cannot exceed 128 characters");
    }

    // Block common weak passwords
    const weakPasswords = ["password", "12345678", "qwerty123", "admin123"];
    if (password && weakPasswords.includes(password.toLowerCase())) {
      errors.push("Please choose a stronger password");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fix the following errors",
        errors: errors,
      });
    }

    // Sanitize inputs for consistent data format
    req.body.name = name.trim();
    req.body.email = email.toLowerCase().trim();
    req.body.phone = phone.trim();

    next();
  }

  /**
   * Validates user login credentials
   * 
   * Validates: email format, password presence
   * Sanitizes: email to lowercase and trimmed
   * 
   * @param {Object} req - Express request object with body containing {email, password}
   * @param {Object} res - Express response object  
   * @param {Function} next - Express next middleware function
   * 
   * Usage: router.post('/login', ValidationMiddleware.validateLogin, controller)
   */
  static validateLogin(req, res, next) {
    const { email, password } = req.body;
    const errors = [];

    // Required field validation
    if (!email || !email.trim()) {
      errors.push("Email is required");
    }

    if (!password || !password.trim()) {
      errors.push("Password is required");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      errors.push("Please provide a valid email address");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fix the following errors",
        errors: errors,
      });
    }

    // Sanitize email input
    req.body.email = email.toLowerCase().trim();

    next();
  }

  /**
   * Validates OTP verification input
   * 
   * Validates: email format, OTP format (6 digits)
   * Sanitizes: email to lowercase, OTP trimmed
   * 
   * @param {Object} req - Express request object with body containing {email, otp}
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * Usage: router.post('/verify-otp', ValidationMiddleware.validateOTP, controller)
   */
  static validateOTP(req, res, next) {
    const { email, otp } = req.body;
    const errors = [];

    // Required field validation
    if (!email || !email.trim()) {
      errors.push("Email is required");
    }

    if (!otp || !otp.trim()) {
      errors.push("OTP is required");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      errors.push("Please provide a valid email address");
    }

    // OTP format validation - exactly 6 digits
    const otpRegex = /^\d{6}$/;
    if (otp && !otpRegex.test(otp.trim())) {
      errors.push("OTP must be a 6-digit number");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fix the following errors",
        errors: errors,
      });
    }

    // Sanitize inputs
    req.body.email = email.toLowerCase().trim();
    req.body.otp = otp.trim();

    next();
  }

  /**
   * Validates email-only input for operations like resend OTP
   * 
   * Validates: email format and presence
   * Sanitizes: email to lowercase and trimmed
   * 
   * @param {Object} req - Express request object with body containing {email}
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * Usage: router.post('/resend-otp', ValidationMiddleware.validateEmail, controller)
   */
  static validateEmail(req, res, next) {
    const { email } = req.body;
    const errors = [];

    // Required field validation
    if (!email || !email.trim()) {
      errors.push("Email is required");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      errors.push("Please provide a valid email address");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fix the following errors",
        errors: errors,
      });
    }

    // Sanitize email input
    req.body.email = email.toLowerCase().trim();

    next();
  }

  /**
   * Rate limiting middleware for OTP requests to prevent spam/abuse
   * 
   * Limits: 5 requests per hour per IP+email combination
   * Tracks: Request timestamps in global memory map
   * Blocks: Requests exceeding rate limit with 429 status
   * 
   * @param {Object} req - Express request object (uses IP and body.email)
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * Usage: router.post('/send-otp', ValidationMiddleware.rateLimitOTP, controller)
   * Note: For production, consider using Redis instead of global memory
   */
  static rateLimitOTP(req, res, next) {
    const maxRequestsPerHour = 5;
    const windowMs = 60 * 60 * 1000; // 1 hour window

    // Initialize global rate limiting store if not exists
    if (!global.otpRequests) {
      global.otpRequests = new Map();
    }

    // Create unique key combining IP and email
    const clientIP = req.ip || req.connection.remoteAddress;
    const key = `${clientIP}_${req.body.email}`;
    const now = Date.now();

    // Get existing requests and filter to current window
    const requests = global.otpRequests.get(key) || [];
    const recentRequests = requests.filter((time) => now - time < windowMs);

    // Check if rate limit exceeded
    if (recentRequests.length >= maxRequestsPerHour) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Too many OTP requests. Please try again later",
      });
    }

    // Add current request timestamp and update store
    recentRequests.push(now);
    global.otpRequests.set(key, recentRequests);

    next();
  }
}

export default ValidationMiddleware;