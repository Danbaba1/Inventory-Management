import BusinessService from "../services/business.service.js";

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
   * Success Response (200):
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
  static async register(req, res) {
    try {
      // Extract authenticated user ID from JWT middleware
      const userId = req.user?.userId;
      const businessData = req.body;

      // Delegate business logic to service layer
      // Service handles validation, uniqueness checks, and database operations
      const result = await BusinessService.registerBusiness(
        businessData,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      // Handle input validation errors
      if (
        err.message === "Please provide both name and type" ||
        err.message === "User ID is required to register a business" ||
        err.message === "Business with this name already exists"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error registering business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error registering business",
      });
    }
  }

  /**
   * Get Businesses with Filtering and Pagination
   * 
   * Retrieves a paginated list of businesses with optional filtering capabilities.
   * Supports search, filtering by type and owner, and pagination for large datasets.
   * 
   * Query Features:
   * - Pagination with configurable page size
   * - Search by business name (partial match)
   * - Filter by business type
   * - Filter by owner (useful for admin operations)
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
   * @param {Object} req.query - Query parameters for filtering and pagination
   * @param {number} [req.query.page=1] - Page number (starts from 1)
   * @param {number} [req.query.limit=10] - Items per page (max 100)
   * @param {string} [req.query.type] - Filter by business type
   * @param {string} [req.query.owner] - Filter by owner ID (admin use)
   * @param {string} [req.query.search] - Search in business names
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated business list with metadata
   * 
   * @example
   * GET /api/business?page=1&limit=20&type=Technology&search=Tech
   * 
   * Success Response (200):
   * {
   *   "message": "Businesses retrieved successfully",
   *   "businesses": [business_objects],
   *   "totalBusinesses": 45,
   *   "totalPages": 3,
   *   "currentPage": 1,
   *   "hasNextPage": true,
   *   "hasPrevPage": false
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination parameters
   * - 500: Server error during retrieval
   */
  static async getBusinesses(req, res) {
    try {
      // Parse and validate pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Validate pagination bounds
      if (page < 1) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Limit must be between 1 and 100",
        });
      }

      const userId = req.user?.userId;

      // Build filter object from query parameters
      // Automatically add owner filter for the authenticated user
      const filters = {
        owner: userId,
      };

      // Add optional filters
      if (req.query.type) filters.type = req.query.type;
      if (req.query.search) filters.search = req.query.search;

      // Service handles filtering, pagination, and data aggregation
      const result = await BusinessService.getBusinesses(page, limit, filters);

      res.status(200).json({
        message: "Businesses retrieved successfully",
        ...result,
      });
    } catch (err) {
      console.error("Error getting businesses", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving businesses",
      });
    }
  }

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
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.id - Business ID to update
   * @param {string} req.query.userId - Owner's user ID for verification
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
   * PUT /api/business?id=business_id&userId=owner_id
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
   * - 400: Missing business ID, unauthorized access, or duplicate name
   * - 404: Business not found
   * - 500: Server error during update
   */
  static async updateBusiness(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      // Build update object, filtering out undefined values
      const updateData = {
        name: req.body.name,
        type: req.body.type,
        categories: req.body.categories,
        description: req.body.description,
        address: req.body.address,
        contactInfo: req.body.contactInfo,
      };

      // Remove undefined fields to support partial updates
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Service handles authorization, validation, and database operations
      const result = await BusinessService.updateBusiness(
        id,
        updateData,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      // Handle business logic and validation errors
      if (
        err.message === "Please provide your business ID" ||
        err.message === "Business does not exist" ||
        err.message === "You are not authorized to update this business" ||
        err.message === "Business with this name already exists"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error updating business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error updating business",
      });
    }
  }

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
   *   "message": "Business deleted successfully",
   *   "deletedBusinessId": "business_id_here",
   *   "associatedDataCleaned": {
   *     "categories": 5,
   *     "products": 23,
   *     "inventoryRecords": 156
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing business ID or unauthorized access
   * - 404: Business not found
   * - 500: Server error during deletion
   */
  static async deleteBusiness(req, res) {
    try {
      // Extract business ID from URL parameters
      const { id } = req.params;

      // Get authenticated user ID
      const userId = req.user?.userId;

      // Service handles authorization checks and cascading deletion
      const result = await BusinessService.deleteBusiness(id, userId);

      res.status(200).json(result);
    } catch (err) {
      // Handle business logic and authorization errors
      if (
        err.message === "Business ID is required" ||
        err.message === "Business does not exist" ||
        err.message === "You are not authorized to delete this business"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error deleting business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error deleting business",
      });
    }
  }
}

export default BusinessController;