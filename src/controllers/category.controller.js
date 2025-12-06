import CategoryService from "../services/category.service.js";
import { asyncHandler, SuccessResponse, RequestValidator } from "../utils/apiHelpers.js";

/**
 * Category Controller - Manages product categorization within businesses
 * 
 * This controller handles the creation and management of product categories within
 * a business context. Categories serve as organizational units that group related
 * products together, enabling better inventory organization and management.
 * 
 * Category Hierarchy:
 * Business -> Categories -> Products
 * 
 * Key Features:
 * - Business-specific category creation and management
 * - Category-based product organization
 * - Owner-based access control (only business owners can manage categories)
 * - Category lifecycle management (create, read, update, delete)
 * - Validation to prevent duplicate categories within the same business
 * 
 * Business Logic Rules:
 * - Users must own a business before creating categories
 * - Category names must be unique within each business
 * - Categories are automatically associated with the user's business
 * - Deleting a category affects all products in that category
 * - Only authenticated business owners can perform category operations
 * 
 * Data Relationships:
 * - Each category belongs to exactly one business
 * - Each category can contain multiple products
 * - Categories are automatically linked to their business owner
 * 
 * @class CategoryController
 * @requires CategoryService
 */
class CategoryController {

  /**
   * Create New Category
   * 
   * Creates a new product category within the user's business. Categories help
   * organize products into logical groups for better inventory management and
   * easier product discovery.
   * 
   * Creation Process:
   * 1. Extract authenticated user information from JWT token
   * 2. Validate category name is provided and non-empty
   * 3. Verify user owns a business (categories require business context)
   * 4. Check category name uniqueness within the business
   * 5. Create category record linked to business and user
   * 6. Initialize category with default settings
   * 
   * Validation Rules:
   * - Category name is required and must be non-empty string
   * - User must be authenticated and own a business
   * - Category name must be unique within the business scope
   * - Description is optional but limited in length
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Category creation data
   * @param {string} req.body.name - Category name (required, unique within business)
   * @param {string} [req.body.description] - Optional category description
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - ID of the authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Category creation result
   * 
   * @example
   * POST /api/categories
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "name": "Electronics",
   *   "description": "Electronic devices and accessories"
   * }
   * 
   * Success Response (201):
   * {
   *   "message": "Category created successfully",
   *   "category": {
   *     "id": "category_id",
   *     "name": "Electronics",
   *     "description": "Electronic devices and accessories",
   *     "business": "business_id",
   *     "isActive": true,
   *     "products": [],
   *     "createdAt": "2024-01-01T00:00:00.000Z"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Invalid name, duplicate category, or user has no business
   * - 401: User not authenticated
   * - 500: Server error during creation
   */
  static createCategory = asyncHandler(async (req, res) => {
    const { name, description, businessId } = req.body;
    const userId = req.user?.userId;

    // Delegate business logic to service layer
    // Service handles validation, business ownership checks, and database operations
    const result = await CategoryService.createCategory(
      name,
      description,
      businessId,
      userId
    );

    return SuccessResponse.created(res, result.category, result.message);
  });

  /**
   * Get Categories with Pagination
   * 
   * Retrieves a paginated list of categories belonging to the user's business.
   * Only returns categories that the authenticated user owns through their business.
   * 
   * Features:
   * - Pagination support for large category lists
   * - Business-scoped results (only user's categories)
   * - Active category filtering
   * - Product count inclusion for each category
   * - Sorting by creation date (newest first)
   * 
   * Authorization:
   * - User must be authenticated
   * - User must own a business
   * - Only returns categories from user's business
   * 
   * Performance Optimizations:
   * - Database indexes on business and active status
   * - Efficient pagination queries
   * - Selective field projection
   * - Product count aggregation
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number (starts from 1)
   * @param {number} [req.query.limit=10] - Items per page (max 100)
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for business ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated categories list
   * 
   * @example
   * GET /api/categories?page=1&limit=20
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Categories retrieved successfully",
   *   "categories": [
   *     {
   *       "id": "category_id",
   *       "name": "Electronics",
   *       "description": "Electronic devices",
   *       "productCount": 15,
   *       "isActive": true,
   *       "createdAt": "2024-01-01T00:00:00.000Z"
   *     }
   *   ],
   *   "pagination": {
   *     "totalCategories": 5,
   *     "totalPages": 1,
   *     "currentPage": 1,
   *     "hasNextPage": false,
   *     "hasPrevPage": false
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination or user has no business
   * - 401: User not authenticated
   * - 500: Server error during retrieval
   */
  static getCategories = asyncHandler(async (req, res) => {
    // Validate pagination parameters
    const { page, limit } = RequestValidator.validatePagination(req.query);
    const { businessId } = req.params;
    const userId = req.user?.userId;

    // Service handles business ownership verification and data retrieval
    const result = await CategoryService.getCategories(userId, businessId, { page, limit });

    return SuccessResponse.okWithPagination(
      res,
      result.data,
      result.pagination,
      "Categories retrieved successfully"
    );
  });

  /**
   * Update Category Information
   * 
   * Updates existing category details including name and description.
   * Only the business owner can modify categories within their business.
   * Supports partial updates where only provided fields are changed.
   * 
   * Update Process:
   * 1. Validate category ID from URL parameters
   * 2. Verify user authentication and business ownership
   * 3. Check category exists and belongs to user's business
   * 4. Validate new name uniqueness (if name is being updated)
   * 5. Apply updates to category record
   * 6. Return updated category information
   * 
   * Business Rules:
   * - Category ID is required in URL parameters
   * - Only category owner can update categories
   * - Updated name must be unique within business
   * - Partial updates supported (name and/or description)
   * - System tracks modification timestamps
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Category ID to update (required)
   * @param {Object} req.body - Update data
   * @param {string} [req.body.name] - New category name (must be unique)
   * @param {string} [req.body.description] - New category description
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Category update result
   * 
   * @example
   * PUT /api/categories/category_id_here
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "name": "Consumer Electronics",
   *   "description": "Updated description for electronics category"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Category updated successfully",
   *   "category": {
   *     "id": "category_id",
   *     "name": "Consumer Electronics",
   *     "description": "Updated description",
   *     "business": "business_id",
   *     "updatedAt": "2024-01-02T00:00:00.000Z"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing ID, invalid UUID format, duplicate name, or authorization issues
   * - 401: User not authenticated
   * - 404: Category not found
   * - 500: Server error during update
   */
  static updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.userId;

    // Validate UUID format
    RequestValidator.validateUUID(id, "Category ID");

    // Service handles validation, authorization, and database operations
    const result = await CategoryService.updateCategory(
      id,
      name,
      description,
      userId
    );

    return SuccessResponse.ok(res, result.category, result.message);
  });

  /**
   * Delete Category
   * 
   * Permanently removes a category from the business. This operation also handles
   * the cleanup of associated products and their inventory records. This is a
   * destructive operation that requires proper authorization.
   * 
   * Deletion Process:
   * 1. Validate category ID from URL parameters and user authentication
   * 2. Verify category exists and belongs to user's business
   * 3. Check for associated products and handle cleanup:
   *    - Remove products in the category
   *    - Clean up inventory records for those products
   *    - Update business category associations
   * 4. Remove category record from database
   * 5. Return confirmation of deletion
   * 
   * Data Integrity Considerations:
   * - Cascading deletion of dependent records
   * - Product reassignment or removal handling
   * - Inventory history preservation options
   * - Business category list updates
   * 
   * Authorization Requirements:
   * - User must be authenticated
   * - User must own the business containing the category
   * - Category must exist and be accessible
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Category ID to delete (required)
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Category deletion result
   * 
   * @example
   * DELETE /api/categories/category_id_here
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Category deleted successfully"
   * }
   * 
   * Error Responses:
   * - 400: Missing ID, invalid UUID format, category not found, or authorization issues
   * - 401: User not authenticated
   * - 500: Server error during deletion
   */
  static deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Validate UUID format
    RequestValidator.validateUUID(id, "Category ID");

    // Service handles authorization, cascading deletion, and cleanup
    const message = await CategoryService.deleteCategory(id, userId);

    return SuccessResponse.ok(res, null, message);
  });
}

export default CategoryController;