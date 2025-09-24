import ProductService from "../services/product.service.js";

/**
 * Product Controller - Manages product catalog and inventory items
 * 
 * This controller handles the complete lifecycle of products within a business
 * inventory system. Products are the core items that businesses track, manage,
 * and sell. Each product belongs to a category within a business and has
 * associated inventory tracking.
 * 
 * Product Management Hierarchy:
 * Business -> Categories -> Products -> Inventory Records
 * 
 * Core Features:
 * - Product creation with category association
 * - Comprehensive product information management (name, price, quantity, description)
 * - Business-scoped product operations (multi-tenancy support)
 * - Product availability tracking and stock management
 * - Product search and pagination capabilities
 * - Owner-based access control for all operations
 * 
 * Business Logic Rules:
 * - Products must belong to a category within the user's business
 * - Product names must be unique within each business scope
 * - Only business owners can manage their products
 * - Products maintain real-time quantity tracking
 * - Product availability is automatically managed based on stock levels
 * 
 * Data Relationships:
 * - Each product belongs to exactly one category
 * - Each product belongs to exactly one business (via category)
 * - Products can have multiple inventory transactions (top-ups, usage)
 * - Product availability affects business operations and sales
 * 
 * @class ProductController
 * @requires ProductService
 */
class ProductController {

  /**
   * Create New Product
   * 
   * Creates a new product within a specified category of the user's business.
   * Products are the fundamental units of inventory tracking and must be
   * properly categorized for organizational purposes.
   * 
   * Product Creation Process:
   * 1. Validate user authentication and business ownership
   * 2. Extract category ID from query parameters
   * 3. Verify category exists and belongs to user's business
   * 4. Validate product information (name, price, quantity)
   * 5. Check product name uniqueness within business
   * 6. Create product record with initial inventory
   * 7. Link product to category and business
   * 8. Initialize availability status based on quantity
   * 
   * Validation Requirements:
   * - Product name is required and must be unique within business
   * - Category ID must be provided and must exist in user's business
   * - Price must be a non-negative number
   * - Initial quantity must be a non-negative integer
   * - Description is optional but has length limits
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.categoryId - Category ID where product will be created
   * @param {Object} req.body - Product creation data
   * @param {string} req.body.name - Product name (required, unique within business)
   * @param {number} req.body.quantity - Initial stock quantity (non-negative)
   * @param {number} req.body.price - Product price (non-negative)
   * @param {string} [req.body.description] - Optional product description
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for business ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Product creation result
   * 
   * @example
   * POST /api/products?categoryId=category_id_here
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "name": "iPhone 15 Pro",
   *   "quantity": 50,
   *   "price": 999.99,
   *   "description": "Latest iPhone model with advanced features"
   * }
   * 
   * Success Response (201):
   * {
   *   "message": "Product created successfully",
   *   "result": {
   *     "id": "product_id",
   *     "name": "iPhone 15 Pro",
   *     "quantity": 50,
   *     "price": 999.99,
   *     "description": "Latest iPhone model with advanced features",
   *     "category": "category_id",
   *     "business": "business_id",
   *     "isAvailable": true,
   *     "createdAt": "2024-01-01T00:00:00.000Z"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing/invalid data, duplicate name, or category issues
   * - 401: User not authenticated
   * - 403: User doesn't own business
   * - 500: Server error during creation
   */
  static async createProduct(req, res) {
    try {
      const { name, quantity, price, description, categoryId } = req.body;
      const userId = req.user?.userId;

      // Delegate comprehensive validation and creation logic to service layer
      const result = await ProductService.createProduct(
        name,
        categoryId,
        quantity,
        price,
        description,
        userId
      );

      res.status(201).json({
        message: "Product created successfully",
        result: result,
      });
    } catch (err) {
      // Handle input validation errors
      if (
        err.message === "Please provide a valid product name" ||
        err.message === "Please provide a category" ||
        err.message === "Please provide a valid price" ||
        err.message === "Please provide a valid quantity" ||
        err.message === "Category does not exist in your business" ||
        err.message === "Product with this name already exists in your business" ||
        err.message === "You must register a business before creating products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error creating product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error creating product",
      });
    }
  }

  /**
   * Get Products with Pagination and Filtering
   * 
   * Retrieves a paginated list of products belonging to the user's business.
   * Includes comprehensive product information, category details, and current
   * stock levels for inventory management purposes.
   * 
   * Features:
   * - Business-scoped product retrieval (multi-tenancy support)
   * - Pagination for handling large product catalogs
   * - Product availability status calculation
   * - Category information inclusion for organization
   * - Stock level reporting for inventory management
   * - Sorting by creation date (newest first)
   * 
   * Response Enhancement:
   * - Real-time stock levels
   * - Availability status (in stock/out of stock)
   * - Category association details
   * - Product performance metrics preparation
   * 
   * Authorization:
   * - User must be authenticated
   * - User must own a business
   * - Results filtered by business ownership
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
   * @returns {Promise<void>} Paginated products list
   * 
   * @example
   * GET /api/products?page=1&limit=20
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Products retrieved successfully",
   *   "products": [
   *     {
   *       "id": "product_id",
   *       "name": "iPhone 15 Pro",
   *       "price": 999.99,
   *       "quantity": 45,
   *       "isAvailable": true,
   *       "inStock": true,
   *       "category": {
   *         "id": "category_id",
   *         "name": "Smartphones"
   *       },
   *       "description": "Latest iPhone model",
   *       "createdAt": "2024-01-01T00:00:00.000Z",
   *       "updatedAt": "2024-01-02T00:00:00.000Z"
   *     }
   *   ],
   *   "totalProducts": 156,
   *   "totalPages": 8,
   *   "currentPage": 1,
   *   "hasNextPage": true,
   *   "hasPrevPage": false
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination or user has no business
   * - 401: User not authenticated
   * - 500: Server error during retrieval
   */
  static async getProducts(req, res) {
    try {
      // Parse and validate pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const userId = req.user?.userId;

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

      // Service handles business verification and data retrieval with joins
      const result = await ProductService.getProducts(page, limit, userId);

      res.status(200).json(result
      );
    } catch (err) {
      // Handle business logic errors
      if (
        err.message === "You must register a business to view products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error getting products", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving products",
      });
    }
  }

  /**
   * Update Product Information
   * 
   * Updates existing product details including basic information, pricing,
   * stock levels, and category associations. Supports partial updates where
   * only provided fields are modified.
   * 
   * Update Capabilities:
   * - Basic information (name, description)
   * - Pricing information (price adjustments)
   * - Stock quantity (direct inventory adjustment)
   * - Category reassignment (within business categories)
   * - Availability status management
   * 
   * Business Rules for Updates:
   * - Product ID is required for identification
   * - Only product owners can update their products
   * - Updated name must be unique within business
   * - Category changes must be within the same business
   * - Price and quantity must be non-negative values
   * - System tracks all modification timestamps
   * 
   * Inventory Impact:
   * - Direct quantity updates affect available stock
   * - Availability status automatically recalculated
   * - Inventory history may be created for tracking
   * - Stock level changes trigger business logic updates
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.id - Product ID to update (required)
   * @param {Object} req.body - Update data (partial updates supported)
   * @param {string} [req.body.name] - Updated product name (must be unique)
   * @param {string} [req.body.description] - Updated product description
   * @param {number} [req.body.price] - Updated product price (non-negative)
   * @param {number} [req.body.quantity] - Updated stock quantity (non-negative)
   * @param {string} [req.body.categoryId] - New category ID (within business)
   * @param {boolean} [req.body.isAvailable] - Availability status override
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Product update result
   * 
   * @example
   * PUT /api/products?id=product_id
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "name": "iPhone 15 Pro Max",
   *   "price": 1199.99,
   *   "quantity": 75,
   *   "description": "Updated description with new features"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Product updated successfully",
   *   "result": {
   *     "id": "product_id",
   *     "name": "iPhone 15 Pro Max",
   *     "price": 1199.99,
   *     "quantity": 75,
   *     "description": "Updated description",
   *     "isAvailable": true,
   *     "updatedAt": "2024-01-02T00:00:00.000Z"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing ID, duplicate name, invalid data, or authorization issues
   * - 404: Product not found
   * - 500: Server error during update
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.userId;

      // Service handles validation, authorization, and complex update logic
      const result = await ProductService.updateProduct(id, updateData, userId);

      res.status(200).json({
        message: "Product updated successfully",
        result: result,
      });
    } catch (err) {
      // Handle validation and business logic errors
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist" ||
        err.message === "Product with name already exists in your business" ||
        err.message === "Category does not exist in your business" ||
        err.message === "You must own a business to update products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors
      console.error("Error updating product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error updating product",
      });
    }
  }

  /**
   * Delete Product
   * 
   * Permanently removes a product from the business catalog along with all
   * associated inventory records and history. This is a destructive operation
   * that requires proper authorization and careful handling of related data.
   * 
   * Deletion Process:
   * 1. Validate product ID and user authentication
   * 2. Verify product exists and belongs to user's business
   * 3. Handle associated data cleanup:
   *    - Remove all inventory top-up records
   *    - Remove all usage history records
   *    - Update category product associations
   *    - Clean up any pending transactions
   * 4. Remove product record from database
   * 5. Update business statistics and counts
   * 
   * Data Integrity Considerations:
   * - Cascading deletion of inventory records
   * - Category product count updates
   * - Business inventory statistics recalculation
   * - Historical data preservation (if required for audit trails)
   * - Transaction rollback capabilities for failed deletions
   * 
   * Security and Authorization:
   * - User must be authenticated with valid JWT token
   * - User must own the business containing the product
   * - Product must exist and belong to user's business
   * - Deletion operations are logged for audit purposes
   * 
   * Impact Assessment:
   * - Permanent data loss (cannot be undone)
   * - Affects inventory reports and analytics
   * - Updates category product counts
   * - Removes product from all business statistics
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Query parameters
   * @param {string} req.query.id - Product ID to delete (required)
   * @param {Object} req.user - Authenticated user from JWT middleware
   * @param {string} req.user.userId - User ID for ownership verification
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Product deletion confirmation
   * 
   * @example
   * DELETE /api/products?id=product_id_to_delete
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Product deleted successfully"
   * }
   * 
   * Error Responses:
   * - 400: Missing product ID, product not found, or authorization issues
   * - 401: User not authenticated
   * - 403: User doesn't own the business containing the product
   * - 404: Product not found in user's business
   * - 500: Server error during deletion (may indicate data integrity issues)
   * 
   * @warning This operation is irreversible. Ensure proper confirmation
   * mechanisms are in place in the frontend before calling this endpoint.
   * 
   * @see ProductService.deleteProduct For detailed deletion logic and cascading operations
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      // Service handles validation, authorization, and cascading deletions
      const message = await ProductService.deleteProduct(id, userId);

      res.status(200).json({
        message: message,
      });
    } catch (err) {
      // Handle validation and authorization errors
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist" ||
        err.message === "You must own a business to delete products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors during deletion
      console.error("Error deleting product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error deleting product",
      });
    }
  }
}

export default ProductController;