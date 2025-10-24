import BusinessService from "../services/business.service.js";
import { asyncHandler, SuccessResponse, RequestValidator } from "../utils/apiHelpers.js";

/**
 * Business Controller - Manages business operations and multi-tenancy
 * 
 * This controller handles business registration, management, and ownership operations.
 * It enables multi-business support where users can own and manage multiple businesses,
 * each with their own categories, products, and inventory.
 * 
 * Core Features:
 * - Business registration and profile management
 * - Owner-based access control and authorization
 * - Business information updates (name, type, description, contact info)
 * - Business deletion with proper cleanup
 * - Pagination and filtering for business listings
 * - Multi-tenancy support for enterprise users
 * 
 * Business Model Hierarchy:
 * User -> Business -> Categories -> Products -> Inventory
 * 
 * Access Control:
 * - Only authenticated users can register businesses
 * - Only business owners can modify their businesses
 * - Admin users have oversight capabilities
 * 
 * @class BusinessController
 * @requires BusinessService
 */
class BusinessController {

  /**
   * Register New Business
   * 
   * Creates a new business entity for the authenticated user. This establishes
   * the foundation for multi-tenant inventory management where each business
   * operates independently with its own categories and products.
   * 
   * Business Registration Flow:
   * 1. Extract user ID from authenticated request
   * 2. Validate required business data (name, type)
   * 3. Check for business name uniqueness across the system
   * 4. Create business record with user as owner
   * 5. Initialize business with default settings
   * 
   * Validation Rules:
   * - Business name must be unique system-wide
   * - Business type is required (e.g., "Retail", "Manufacturing")
   * - User must be authenticated to register business
   * - Each user can register multiple businesses
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user data from JWT middleware
   * @param {string} req.user.userId - ID of the authenticated user
   * @param {Object} req.body - Business registration data
   * @param {string} req.body.name - Business name (must be unique)
   * @param {string} req.body.type - Business type/category
   * @param {string} [req.body.description] - Optional business description
   * @param {Object} [req.body.address] - Optional business address
   * @param {Object} [req.body.contactInfo] - Optional contact information
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Business registration result
   * 
   * @example
   * POST /api/business/register
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "name": "Tech Solutions Inc",
   *   "type": "Technology Services",
   *   "description": "IT consulting and software solutions",
   *   "address": {
   *     "street": "123 Tech Street",
   *     "city": "San Francisco",
   *     "state": "CA",
   *     "zipCode": "94101",
   *     "country": "USA"
   *   },
   *   "contactInfo": {
   *     "email": "contact@techsolutions.com",
   *     "phone": "+1-555-0123",
   *     "website": "https://techsolutions.com"
   *   }
   * }
   * 
   * Success Response (201):
   * {
   *   "message": "Business registered successfully",
   *   "business": {
   *     "id": "business_id",
   *     "name": "Tech Solutions Inc",
   *     "type": "Technology Services",
   *     "owner": "user_id",
   *     "isActive": true,
   *     "createdAt": "2024-01-01T00:00:00.000Z"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing required fields or duplicate business name
   * - 401: User not authenticated
   * - 500: Server error during registration
   */
  static register = asyncHandler(async (req, res) => {
    // Extract authenticated user ID from JWT middleware
    const userId = req.user?.userId;
    const businessData = req.body;

    // Validate required fields
    RequestValidator.validateRequired(req.body, ["name", "type"]);

    const result = await BusinessService.registerBusiness(businessData, userId);

    // Use SuccessResponse for consistent formatting
    return SuccessResponse.created(res, result.business, result.message);
  });

  /**
   * Get Businesses with Filtering and Pagination
   * 
   * Retrieves a paginated list of businesses owned by the authenticated user
   * with optional filtering capabilities. Supports search, filtering by type,
   * and pagination for large datasets.
   * 
   * Query Features:
   * - Pagination with configurable page size
   * - Search by business name (partial match)
   * - Filter by business type
   * - Automatic filtering by authenticated user (owner)
   * - Sorting by creation date (newest first)
   * 
   * Performance Considerations:
   * - Database indexes on commonly filtered fields
   * - Limit maximum page size to prevent resource exhaustion
   * - Efficient aggregation queries for filtering
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user data from JWT middleware
   * @param {string} req.user.userId - ID of the authenticated user
   * @param {Object} req.query - Query parameters for filtering and pagination
   * @param {number} [req.query.page=1] - Page number (starts from 1)
   * @param {number} [req.query.limit=10] - Items per page (max 100)
   * @param {string} [req.query.type] - Filter by business type
   * @param {string} [req.query.search] - Search in business names
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated business list with metadata
   * 
   * @example
   * GET /api/business?page=1&limit=20&type=Technology&search=Tech
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Businesses retrieved successfully",
   *   "businesses": [business_objects],
   *   "pagination": {
   *     "totalBusinesses": 45,
   *     "totalPages": 3,
   *     "currentPage": 1,
   *     "hasNextPage": true,
   *     "hasPrevPage": false
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination parameters
   * - 401: User not authenticated
   * - 500: Server error during retrieval
   */
  static getBusinesses = asyncHandler(async (req, res) => {
    // Validate pagination parameters
    const { page, limit } = RequestValidator.validatePagination(req.query);

    const userId = req.user?.userId;

    // Build filter object from query parameters
    // Automatically add owner filter for the authenticated user
    const filters = {
      owner: userId,
      type: req.query.type,
      search: req.query.search,
    };

    // Service handles filtering, pagination, and data aggregation
    const result = await BusinessService.getBusinesses(page, limit, filters);

    return SuccessResponse.okWithPagination(
      res,
      result.businesses,
      result.pagination,
      result.message
    );
  });

  /**
   * Update Business Information
   * 
   * Updates existing business details. Only the business owner can modify
   * their business information. Supports partial updates where only provided
   * fields are updated.
   * 
   * Update Capabilities:
   * - Basic information (name, type, description)
   * - Address details (street, city, state, zip, country)
   * - Contact information (email, phone, website)
   * - Category associations (business categories)
   * 
   * Authorization Rules:
   * - User must be authenticated
   * - User must be the business owner
   * - Business must exist and be active
   * - Business name uniqueness is enforced
   * 
   * Update Strategy:
   * - Partial updates supported (only send changed fields)
   * - Undefined fields are ignored (not set to null)
   * - Validation applied to all provided fields
   * - Optimistic locking to prevent concurrent modifications
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Business ID to update
   * @param {Object} req.user - Authenticated user data from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} req.body - Update data (partial object allowed)
   * @param {string} [req.body.name] - Updated business name
   * @param {string} [req.body.type] - Updated business type
   * @param {Array} [req.body.categories] - Updated category associations
   * @param {string} [req.body.description] - Updated description
   * @param {Object} [req.body.address] - Updated address information
   * @param {Object} [req.body.contactInfo] - Updated contact details
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Business update result
   * 
   * @example
   * PUT /api/business/business_id_here
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "description": "Updated business description",
   *   "contactInfo": {
   *     "phone": "+1-555-0199",
   *     "website": "https://newwebsite.com"
   *   }
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Business updated successfully",
   *   "business": { updated_business_object }
   * }
   * 
   * Error Responses:
   * - 400: Missing business ID, invalid UUID format, unauthorized access, or duplicate name
   * - 401: User not authenticated
   * - 404: Business not found
   * - 500: Server error during update
   */
  static updateBusiness = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Validate UUID format
    RequestValidator.validateUUID(id, "Business ID");

    // Service handles authorization, validation, and database operations
    const result = await BusinessService.updateBusiness(
      id,
      req.body,
      userId
    );

    return SuccessResponse.ok(res, result.business, result.message);
  });

  /**
   * Delete Business
   * 
   * Permanently removes a business and all associated data including categories,
   * products, and inventory records. This is a destructive operation that requires
   * proper authorization and confirmation.
   * 
   * Deletion Process:
   * 1. Verify user authentication and ownership
   * 2. Check for business existence and active status
   * 3. Remove associated data in proper order:
   *    - Inventory records (top-ups and usage history)
   *    - Products within all categories
   *    - Categories belonging to business
   *    - Business record itself
   * 4. Clean up any orphaned references
   * 
   * Data Integrity Considerations:
   * - Cascading deletion of dependent records
   * - Transaction support to ensure atomicity
   * - Backup recommendations before deletion
   * - Audit logging for deletion operations
   * 
   * Authorization Requirements:
   * - User must be authenticated
   * - User must be the business owner
   * - Business must exist in the system
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Business ID to delete
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Business deletion result
   * 
   * @example
   * DELETE /api/business/business_id_here
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Business deleted successfully"
   * }
   * 
   * Error Responses:
   * - 400: Missing business ID, invalid UUID format, or unauthorized access
   * - 401: User not authenticated
   * - 404: Business not found
   * - 500: Server error during deletion
   */
  static deleteBusiness = asyncHandler(async (req, res) => {
    // Extract business ID from URL parameters
    const { id } = req.params;

    // Get authenticated user ID
    const userId = req.user?.userId;

    RequestValidator.validateUUID(id, "Business ID");

    // Service handles authorization checks and cascading deletion
    const message = await BusinessService.deleteBusiness(id, userId);

    return SuccessResponse.ok(res, null, message);
  });
}

export default BusinessController;