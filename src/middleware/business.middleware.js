import Business from "../models/business.model.js";

/**
 * Business Ownership Verification Middleware - Multi-Tenant Access Control
 * 
 * This middleware provides business-level authorization for the multi-tenant
 * inventory management system. It ensures that users can only access and
 * modify businesses they own, implementing strict ownership-based access
 * control across all business-related operations.
 * 
 * Core Features:
 * - Business ownership verification and validation
 * - Multi-source business ID extraction (params, query, body)
 * - Active business status enforcement
 * - User authentication requirement validation
 * - Business context injection into request object
 * - Comprehensive error handling and security logging
 * 
 * Security Architecture:
 * Request -> Authentication Check -> Business ID Extraction -> Ownership Validation -> Access Grant/Deny
 * 
 * Multi-Tenancy Support:
 * - Prevents cross-tenant data access
 * - Enforces business-level data isolation
 * - Supports multiple businesses per user
 * - Maintains strict ownership boundaries
 * 
 * Business Context:
 * After successful verification, req.business contains the validated
 * business object for use in subsequent middleware and route handlers.
 * 
 * Integration Requirements:
 * - Must be used after authentication middleware
 * - Requires req.user to be populated with authenticated user data
 * - Business ID must be provided in request (params, query, or body)
 * 
 * @module BusinessOwnershipMiddleware
 * @requires Business - Business model for database operations
 */

/**
 * Business Ownership Verification Middleware
 * 
 * Validates that the authenticated user owns the specified business and has
 * the right to perform operations on it. This middleware is essential for
 * maintaining data security and tenant isolation in the multi-business
 * inventory management system.
 * 
 * Verification Flow:
 * 1. Extract business ID from multiple possible request locations
 * 2. Validate business ID presence and format
 * 3. Verify user authentication status
 * 4. Query database for business with ownership and status validation
 * 5. Validate business existence and ownership match
 * 6. Inject business context into request object
 * 7. Pass control to next middleware or route handler
 * 
 * Business ID Sources:
 * - req.params.id: URL parameters (e.g., /business/:id)
 * - req.query.id: Query parameters (e.g., ?id=business_id)
 * - req.body.businessId: Request body field
 * 
 * Ownership Validation:
 * - Business must exist in database
 * - Business owner must match authenticated user
 * - Business must have active status (isActive: true)
 * - User must be authenticated (req.user populated)
 * 
 * Access Control Rules:
 * - Only business owners can access their businesses
 * - Inactive businesses are inaccessible
 * - Unauthenticated requests are rejected
 * - Missing business IDs are rejected
 * 
 * Business Context Injection:
 * After successful verification, req.business contains:
 * - Complete business object from database
 * - All business fields and metadata
 * - Ready for use in route handlers
 * - Cached for request duration
 * 
 * @function verifyBusinessOwnership
 * @async
 * @param {Object} req - Express request object
 * @param {Object} [req.params] - URL parameters
 * @param {string} [req.params.id] - Business ID from URL path
 * @param {Object} [req.query] - Query string parameters
 * @param {string} [req.query.id] - Business ID from query string
 * @param {Object} [req.body] - Request body data
 * @param {string} [req.body.businessId] - Business ID from request body
 * @param {Object} req.user - Authenticated user context (from auth middleware)
 * @param {string} req.user.userId - ID of authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Continues to next middleware or returns error
 * 
 * @example
 * // Route protection with business ownership verification
 * import { verifyBusinessOwnership } from './middleware/business.middleware.js';
 * import { authenticateUser } from './middleware/auth.middleware.js';
 * 
 * // URL parameter business ID
 * router.get('/business/:id/categories', 
 *   authenticateUser, 
 *   verifyBusinessOwnership, 
 *   (req, res) => {
 *     // req.business is now available with verified business data
 *     const categories = req.business.categories;
 *     res.json({ categories });
 *   }
 * );
 * 
 * // Query parameter business ID
 * router.put('/business/update?id=:businessId', 
 *   authenticateUser, 
 *   verifyBusinessOwnership, 
 *   updateBusinessHandler
 * );
 * 
 * // Request body business ID
 * router.post('/products/create', 
 *   authenticateUser, 
 *   verifyBusinessOwnership, 
 *   (req, res) => {
 *     // Create product for verified business
 *     createProduct(req.business._id, req.body);
 *   }
 * );
 * 
 * // Client request examples
 * 
 * // URL parameter approach
 * fetch('/api/business/64a7b8c9d12345e6f7890123/categories', {
 *   headers: {
 *     'Authorization': 'Bearer jwt_token',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * // Query parameter approach
 * fetch('/api/business/update?id=64a7b8c9d12345e6f7890123', {
 *   method: 'PUT',
 *   headers: {
 *     'Authorization': 'Bearer jwt_token',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ name: 'Updated Business Name' })
 * });
 * 
 * // Request body approach
 * fetch('/api/products/create', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer jwt_token',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     businessId: '64a7b8c9d12345e6f7890123',
 *     name: 'New Product',
 *     price: 29.99
 *   })
 * });
 * 
 * Success Response:
 * - Business ownership verified successfully
 * - req.business populated with business object
 * - Access granted to protected business resource
 * - Control passed to next middleware/route handler
 * 
 * Error Responses:
 * - 400: Missing business ID in request
 * - 401: User not authenticated or missing user context
 * - 403: Business not found, user doesn't own business, or business inactive
 * - 500: Server error during ownership verification
 * 
 * Security Features:
 * - Prevents cross-tenant data access
 * - Validates business ownership in real-time
 * - Enforces active business status requirement
 * - Provides comprehensive error logging
 * - Supports multiple ID source locations
 * 
 * Performance Considerations:
 * - Single database query per verification
 * - Efficient composite query (ID + owner + status)
 * - Business object cached in request context
 * - Database indexes recommended on owner and _id fields
 * 
 * Integration Notes:
 * - Must be used after authentication middleware
 * - Compatible with all business-related routes
 * - Supports different business ID passing methods
 * - Provides consistent error response format
 * - Maintains audit trail through error logging
 */
export const verifyBusinessOwnership = async (req, res, next) => {
  try {
    // Extract business ID from multiple possible sources
    // Priority: URL params > query params > request body
    const id = req.params.id || req.query.id || req.body.businessId;

    // Validate business ID presence
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Business ID is required",
      });
    }

    // Extract authenticated user ID from request context
    // This assumes authentication middleware has already run
    const userId = req.user?.userId;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication required",
      });
    }

    // Query database for business with ownership and status validation
    // Composite query ensures business exists, user owns it, and it's active
    const business = await Business.findOne({
      _id: id,           // Business ID match
      owner: userId,     // Ownership validation
      isActive: true,    // Active status requirement
    });

    // Validate business existence and ownership
    if (!business) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this business",
      });
    }

    // Inject verified business context into request object
    // This makes the business data available to subsequent middleware
    // and route handlers without additional database queries
    req.business = business;
    
    // Pass control to next middleware or route handler
    next();
  } catch (err) {
    // Log error for debugging and security monitoring
    console.error("Business ownership verification error:", err);
    
    // Return generic error to prevent information disclosure
    res.status(500).json({
      error: "Internal Server Error",
      message: "Error verifying business ownership",
    });
  }
};