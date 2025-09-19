// validation/validation.middleware.js

class ValidationMiddleware {
    // Validate registration input
    static validateRegistration(req, res, next) {
        const { name, phone, password, email } = req.body;
        const errors = [];

        // Name validation
        if (!name || name.trim().length < 2) {
            errors.push("Name must be at least 2 characters long");
        }
        if (name && name.length > 50) {
            errors.push("Name cannot exceed 50 characters");
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            errors.push("Please provide a valid email address");
        }

        // Phone validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phone || !phoneRegex.test(phone)) {
            errors.push("Please provide a valid phone number");
        }

        // Password validation
        if (!password || password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (password && password.length > 128) {
            errors.push("Password cannot exceed 128 characters");
        }

        // Check for common weak passwords
        const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
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

        // Sanitize inputs
        req.body.name = name.trim();
        req.body.email = email.toLowerCase().trim();
        req.body.phone = phone.trim();

        next();
    }

    // Validate login input
    static validateLogin(req, res, next) {
        const { email, password } = req.body;
        const errors = [];

        if (!email || !email.trim()) {
            errors.push("Email is required");
        }

        if (!password || !password.trim()) {
            errors.push("Password is required");
        }

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

        // Sanitize inputs
        req.body.email = email.toLowerCase().trim();

        next();
    }

    // Validate OTP input
    static validateOTP(req, res, next) {
        const { email, otp } = req.body;
        const errors = [];

        if (!email || !email.trim()) {
            errors.push("Email is required");
        }

        if (!otp || !otp.trim()) {
            errors.push("OTP is required");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email.trim())) {
            errors.push("Please provide a valid email address");
        }

        // OTP should be 6 digits
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

    // Validate email input for resend OTP
    static validateEmail(req, res, next) {
        const { email } = req.body;
        const errors = [];

        if (!email || !email.trim()) {
            errors.push("Email is required");
        }

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

        // Sanitize inputs
        req.body.email = email.toLowerCase().trim();

        next();
    }

    // Rate limiting middleware for OTP requests
    static rateLimitOTP(req, res, next) {
        const maxRequestsPerHour = 5;
        const windowMs = 60 * 60 * 1000; // 1 hour

        // In production, use Redis or database to store rate limit data
        // For now, using in-memory storage (will reset on server restart)
        if (!global.otpRequests) {
            global.otpRequests = new Map();
        }

        const clientIP = req.ip || req.connection.remoteAddress;
        const key = `${clientIP}_${req.body.email}`;
        const now = Date.now();

        const requests = global.otpRequests.get(key) || [];
        const recentRequests = requests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequestsPerHour) {
            return res.status(429).json({
                error: "Too Many Requests",
                message: "Too many OTP requests. Please try again later",
            });
        }

        recentRequests.push(now);
        global.otpRequests.set(key, recentRequests);

        next();
    }
}

export default ValidationMiddleware;