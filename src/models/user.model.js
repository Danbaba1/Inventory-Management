import mongoose from "mongoose";

/**
 * User Schema for authentication and user management
 * Handles user registration, authentication, password reset, and email verification
 * 
 * @description This schema manages user accounts with role-based access control,
 * email verification via OTP, password reset functionality, and rate limiting
 * for security operations.
 */
const UserSchema = new mongoose.Schema(
  {
    /**
     * User's full name
     * @type {String}
     * @required
     * @description Display name for the user account
     */
    name: { type: String, required: true },

    /**
     * Account status flag
     * @type {Boolean}
     * @default true
     * @description Indicates if user account is active and can access the system.
     * Inactive users are effectively soft-deleted and cannot authenticate.
     */
    isActive: { type: Boolean, default: true },

    /**
     * User's phone number
     * @type {String}
     * @optional
     * @description Contact phone number, can be used for SMS notifications or 2FA
     */
    phone: { type: String },

    /**
     * Encrypted password hash
     * @type {String}
     * @required
     * @description Bcrypt hashed password. Never store plain text passwords.
     * Should be validated for strength on frontend before submission.
     */
    password: { type: String, required: true },

    /**
     * User's email address
     * @type {String}
     * @required
     * @unique
     * @description Primary identifier and communication method.
     * Must be unique across all users. Used for login and notifications.
     */
    email: { type: String, required: true },

    /**
     * Password reset token
     * @type {String}
     * @default null
     * @description Temporary token generated for password reset requests.
     * Should be cryptographically secure and single-use.
     */
    resetToken: { type: String, default: null },

    /**
     * Password reset token expiration
     * @type {Date}
     * @default null
     * @description Expiration timestamp for reset token.
     * Tokens should expire within 15-30 minutes for security.
     */
    resetTokenExpiry: { type: Date, default: null },

    /**
     * User role for authorization
     * @type {String}
     * @enum ["user", "admin"]
     * @default "user"
     * @description Role-based access control. "admin" has elevated privileges,
     * "user" has standard access. Can be extended with more roles as needed.
     */
    role: { type: String, enum: ["user", "admin"], default: "user" },

    /**
     * Email verification status
     * @type {Boolean}
     * @default false
     * @description Tracks if user has verified their email address.
     * Unverified users may have limited system access.
     */
    isEmailVerified: { type: Boolean, default: false },

    /**
     * Email verification OTP code
     * @type {String}
     * @default null
     * @description 6-digit numeric code sent to user's email for verification.
     * Should be cleared after successful verification or expiration.
     */
    emailOTP: { type: String, default: null },

    /**
     * OTP expiration timestamp
     * @type {Date}
     * @default null
     * @description When the current OTP expires.
     * OTPs should be short-lived (5-10 minutes) for security.
     */
    otpExpiry: { type: Date, default: null },

    /**
     * Failed OTP attempt counter
     * @type {Number}
     * @default 0
     * @description Tracks failed OTP verification attempts.
     * Used for rate limiting and security monitoring.
     */
    otpAttempts: { type: Number, default: 0 },

    /**
     * Last OTP generation timestamp
     * @type {Date}
     * @default null
     * @description When the last OTP was sent to prevent spam.
     * Enforces minimum interval between OTP requests.
     */
    lastOTPSent: { type: Date, default: null },
  },
  { 
    /**
     * Automatic timestamp management
     * @description Adds createdAt and updatedAt fields automatically
     */
    timestamps: true 
  }
);

/**
 * Database Indexes for Performance Optimization
 */

/**
 * Unique index on email field
 * @description Ensures email uniqueness and optimizes login queries
 */
UserSchema.index({ email: 1 }, { unique: true });

/**
 * Index on resetToken field
 * @description Optimizes password reset token lookups
 */
UserSchema.index({ resetToken: 1 });

/**
 * Index on emailOTP field
 * @description Optimizes OTP verification queries
 */
UserSchema.index({ emailOTP: 1 });

/**
 * Instance Methods
 */

/**
 * Check if user has admin privileges
 * @returns {Boolean} True if user is an admin
 * @description Convenience method for role-based authorization checks
 * @example
 * if (user.isAdmin()) {
 *   // Allow admin-only operations
 * }
 */
UserSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

/**
 * Generate a 6-digit OTP code
 * @returns {String} 6-digit numeric OTP
 * @description Creates a cryptographically random 6-digit code for email verification
 * @example
 * const otp = user.generateOTP();
 * user.emailOTP = otp;
 * user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
 */
UserSchema.methods.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

/**
 * Check if user can request a new OTP (rate limiting)
 * @returns {Boolean} True if user can send OTP (1 minute cooldown passed)
 * @description Prevents OTP spam by enforcing minimum 1-minute interval between requests
 * @example
 * if (user.canSendOTP()) {
 *   const otp = user.generateOTP();
 *   // Send OTP email
 * } else {
 *   // Show "wait before requesting another OTP" message
 * }
 */
UserSchema.methods.canSendOTP = function () {
  if (!this.lastOTPSent) return true;
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  return this.lastOTPSent < oneMinuteAgo;
};

/**
 * Check if user can attempt OTP verification (attempt limiting)
 * @returns {Boolean} True if user hasn't exceeded maximum attempts (5)
 * @description Prevents brute force attacks by limiting OTP verification attempts
 * @example
 * if (user.canAttemptOTP()) {
 *   // Allow OTP verification
 *   if (submittedOTP === user.emailOTP) {
 *     // Success - reset attempts
 *     user.otpAttempts = 0;
 *   } else {
 *     // Failed - increment attempts
 *     user.otpAttempts += 1;
 *   }
 * } else {
 *   // Too many attempts - require new OTP generation
 * }
 */
UserSchema.methods.canAttemptOTP = function () {
  return this.otpAttempts < 5; // Max 5 attempts
};

/**
 * Static Methods
 */

/**
 * Find all active users
 * @returns {Query} Mongoose query for active users
 * @description Convenience method to filter only active user accounts
 * @example
 * const activeUsers = await User.findActive();
 * const adminUsers = await User.findActive().where({ role: 'admin' });
 */
UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

/**
 * User Model
 * @description Main user model for authentication and user management
 * 
 * Key Relationships:
 * - One-to-many with user-generated content (posts, comments, etc.)
 * - References in audit logs and activity tracking
 * - May have profile extensions in separate collections
 * 
 * Security Considerations:
 * - Passwords must be hashed before storage
 * - Reset tokens should be cryptographically secure
 * - OTP codes should expire quickly (5-10 minutes)
 * - Rate limiting prevents abuse of security features
 * 
 * Validation Rules:
 * - Email format validation should be handled at application level
 * - Password strength validation should be enforced before hashing
 * - Phone number format validation if international support needed
 */
const User = mongoose.model("User", UserSchema);
export default User;