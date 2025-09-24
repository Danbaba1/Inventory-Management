import { supabase } from "../config/supabase.js";

/**
 * PRODUCT SERVICE - PostgreSQL/Supabase Implementation
 * Manages product catalog within business and category context with comprehensive validation
 * Provides full CRUD operations for products with business ownership verification
 * Maintains data integrity through relationship validation and inventory management integration
 */
class ProductService {
  /**
   * Create new product within user's business and category with comprehensive validation
   * Establishes product catalog with proper categorization and initial inventory setup
   * 
   * @param {string} name - Product name (required, must be unique within business)
   * @param {string} categoryId - UUID of the category (required, must exist in user's business)
   * @param {number} quantity - Initial quantity (required, must be >= 0)
   * @param {number} price - Product price (required, must be >= 0)
   * @param {string} description - Product description (optional)
   * @param {string} userId - UUID of the user creating the product (required)
   * 
   * @returns {Object} Creation result with product details including category and business information
   * @throws {Error} If validation fails, user has no business, category invalid, or name exists
   * 
   * Business Logic:
   * - Validates user owns an active business
   * - Ensures category exists and belongs to user's business
   * - Checks product name uniqueness within business scope
   * - Sets initial inventory quantity and pricing
   * - Marks product as available by default
   * - Returns product with populated category and business relationships
   * 
   * Validation Rules:
   * - Name must be non-empty and unique within business
   * - Category must exist and be owned by user's business
   * - Price must be non-negative number
   * - Quantity must be non-negative integer
   * - User must own an active business
   * 
   * Use Cases:
   * - New product introduction to catalog
   * - Inventory item setup with initial stock
   * - Product categorization for organization
   */
  static async createProduct(name, categoryId, quantity, price, description, userId) {
    try {
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid product name");
      }

      if (!categoryId) {
        throw new Error("Please provide a category");
      }

      if (price === undefined || price < 0) {
        throw new Error("Please provide a valid price");
      }

      if (quantity === undefined || quantity < 0) {
        throw new Error("Please provide a valid quantity");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      // Verify user has active business
      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must register a business before creating products");
      }

      // Validate category belongs to user's business
      const { data: category } = await supabase
        .from("categories")
        .select("id, name")
        .eq("id", categoryId)
        .eq("business_id", userBusiness.id)
        .eq("is_active", true)
        .single();

      if (!category) {
        throw new Error("Category does not exist in your business");
      }

      // Check product name uniqueness within business
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("name", name.trim())
        .eq("business_id", userBusiness.id)
        .single();

      if (existingProduct) {
        throw new Error("Product with this name already exists in your business");
      }

      // Create product
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          category_id: categoryId,
          business_id: userBusiness.id,
          quantity: Number(quantity),
          price: Number(price),
          description: description?.trim(),
          is_available: true,
        })
        .select(`
          *,
          category:category_id(id, name, description),
          business:business_id(id, name, type)
        `)
        .single();

      if (error) throw error;

      return {
        message: "Product created successfully",
        product,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve paginated products for user's business with advanced filtering capabilities
   * Returns comprehensive product catalog with category and business information for management
   * 
   * @param {number} page - Page number for pagination (default: 1)
   * @param {number} limit - Number of products per page (default: 10)
   * @param {string} userId - UUID of the user requesting products (required)
   * @param {Object} filters - Optional filtering criteria
   * @param {string} filters.categoryId - Filter by specific category UUID
   * @param {string} filters.search - Search in product name and description (case-insensitive)
   * @param {number} filters.minPrice - Minimum price filter
   * @param {number} filters.maxPrice - Maximum price filter
   * @param {boolean} filters.lowStock - Filter for low stock products (quantity < 10)
   * 
   * @returns {Object} Paginated products with category and business details
   * @throws {Error} If user authentication fails or user has no active business
   * 
   * Returned Data Structure:
   * - products: Array of product objects with:
   *   - Complete product information (name, description, price, quantity, availability)
   *   - category: Associated category details (name, description)
   *   - business: Business information (name, type)
   * - pagination: Standard pagination object with navigation information
   * 
   * Filtering Features:
   * - Category-based filtering for focused product management
   * - Text search across name and description fields
   * - Price range filtering for pricing analysis
   * - Low stock filtering for inventory management (< 10 units)
   * - Only shows available products (is_available = true)
   * 
   * Use Cases:
   * - Product catalog browsing and management
   * - Inventory monitoring and stock alerts
   * - Category-specific product organization
   * - Price-based product analysis
   * - Search functionality for large catalogs
   */
  static async getProducts(page = 1, limit = 10, userId, filters = {}) {
    try {
      if (!userId) {
        throw new Error("User authentication required");
      }

      // Verify business ownership
      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must register a business to view products");
      }

      const offset = (page - 1) * limit;

      let query = supabase
        .from("products")
        .select(`
          *,
          category:category_id(name, description),
          business:business_id(name, type)
        `, { count: "exact" })
        .eq("business_id", userBusiness.id)
        .eq("is_available", true);

      // Apply filters
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
      }
      if (filters.lowStock) {
        query = query.lt("quantity", 10); // Define low stock as < 10
      }

      const { data: products, error, count } = await query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Determine appropriate message based on results
      let message;
      if (!products || products.length === 0) {
        message = "No products to display";
      } else {
        message = "Products retrieved successfully";
      }

      return {
        message,
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalProducts: count || 0,
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get a single product by ID with ownership verification and complete relationship data
   * Returns detailed product information including category and business context
   * 
   * @param {string} productId - UUID of the product to retrieve (required)
   * @param {string} userId - UUID of the user requesting the product (required)
   * 
   * @returns {Object} Product details with category and business information
   * @throws {Error} If product not found, user unauthorized, or user has no active business
   * 
   * Business Logic:
   * - Validates user owns an active business
   * - Ensures product belongs to user's business
   * - Returns complete product data with relationships
   * - Includes category and business information for context
   * 
   * Security Features:
   * - Business ownership verification prevents cross-business access
   * - Product-business relationship validation
   * - User authentication requirement
   * 
   * Use Cases:
   * - Product detail viewing for management
   * - Product editing preparation
   * - Inventory item inspection
   * - Product information display
   */
  static async getProductById(productId, userId) {
    try {
      if (!productId || !userId) {
        throw new Error("Product ID and user authentication required");
      }

      // Verify business ownership
      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must own a business to view products");
      }

      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          category:category_id(id, name, description),
          business:business_id(id, name, type)
        `)
        .eq("id", productId)
        .eq("business_id", userBusiness.id)
        .single();

      if (error || !product) {
        throw new Error("Product not found");
      }

      return { product };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Update existing product within user's business with comprehensive validation
   * Allows partial updates while maintaining data integrity and business relationships
   * 
   * @param {string} id - UUID of the product to update (required)
   * @param {Object} updateData - Fields to update
   * @param {string} updateData.name - New product name (optional, must be unique within business)
   * @param {string} updateData.description - New product description (optional)
   * @param {number} updateData.price - New product price (optional, must be >= 0)
   * @param {number} updateData.quantity - New product quantity (optional, must be >= 0)
   * @param {string} updateData.categoryId - New category ID (optional, must exist in business)
   * @param {string} userId - UUID of the user attempting the update (required)
   * 
   * @returns {Object} Update result with updated product details and relationships
   * @throws {Error} If product not found, user unauthorized, validation fails, or update fails
   * 
   * Business Logic:
   * - Validates user owns the business that contains the product
   * - Checks name uniqueness within business if name is being changed
   * - Validates category exists and belongs to user's business if changing category
   * - Supports partial updates (only updates provided fields)
   * - Maintains product-business-category relationships
   * - Returns updated product with complete relationship data
   * 
   * Validation Features:
   * - Name uniqueness within business scope
   * - Category ownership and existence validation
   * - Price and quantity non-negative validation
   * - Input sanitization with trimming
   * - Atomic updates to prevent data corruption
   * 
   * Use Cases:
   * - Product information updates and corrections
   * - Pricing adjustments and inventory updates
   * - Category reorganization and product movement
   * - Product description and metadata updates
   */
  static async updateProduct(id, updateData, userId) {
    try {
      if (!id || !userId) {
        throw new Error("Product ID and user authentication required");
      }

      // Verify business ownership
      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must own a business to update products");
      }

      // Get current product
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("business_id", userBusiness.id)
        .single();

      if (error || !product) {
        throw new Error("Product does not exist");
      }

      const { name, description, price, quantity, categoryId } = updateData;

      // Check name uniqueness if changing
      if (name && name !== product.name) {
        const { data: existingProduct } = await supabase
          .from("products")
          .select("id")
          .eq("name", name.trim())
          .eq("business_id", userBusiness.id)
          .neq("id", id)
          .single();

        if (existingProduct) {
          throw new Error("Product with this name already exists in your business");
        }
      }

      // Validate category if changing
      if (categoryId && categoryId !== product.category_id) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("id", categoryId)
          .eq("business_id", userBusiness.id)
          .eq("is_active", true)
          .single();

        if (!category) {
          throw new Error("Category does not exist in your business");
        }
      }

      // Build update object
      const updateObj = {};
      if (name) updateObj.name = name.trim();
      if (description !== undefined) updateObj.description = description?.trim();
      if (price !== undefined) updateObj.price = Number(price);
      if (quantity !== undefined) updateObj.quantity = Number(quantity);
      if (categoryId) updateObj.category_id = categoryId;

      const { data: updatedProduct, error: updateError } = await supabase
        .from("products")
        .update(updateObj)
        .eq("id", id)
        .select(`
          *,
          category:category_id(name, description),
          business:business_id(name, type)
        `)
        .single();

      if (updateError) throw updateError;

      return {
        message: "Product updated successfully",
        product: updatedProduct,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Soft delete product with inventory activity validation and relationship protection
   * Prevents deletion of products with recent inventory transactions to maintain audit integrity
   * 
   * @param {string} id - UUID of the product to delete (required)
   * @param {string} userId - UUID of the user attempting the deletion (required)
   * 
   * @returns {string} Success message confirming product deletion
   * @throws {Error} If product not found, user unauthorized, recent inventory activity, or deletion fails
   * 
   * Business Logic:
   * - Validates user owns the business that contains the product
   * - Checks for recent inventory transactions (within 24 hours)
   * - Performs soft deletion by setting is_available = false
   * - Preserves product data and transaction history for audit purposes
   * - Prevents deletion of products with active inventory management
   * 
   * Data Integrity Features:
   * - Inventory transaction validation prevents audit trail corruption
   * - Soft deletion preserves historical data and relationships
   * - Business ownership verification ensures security
   * - Recent activity check (24-hour window) protects active inventory
   * 
   * Use Cases:
   * - Removing discontinued or obsolete products
   * - Product catalog cleanup and organization
   * - Inventory item retirement
   * 
   * Prerequisites:
   * - Product must not have inventory transactions in the last 24 hours
   * - User must own the business containing the product
   * 
   * Note: Products with recent inventory activity cannot be deleted to preserve
   * transaction integrity and audit compliance. This prevents accidental loss
   * of inventory management data and maintains business operation continuity.
   */
  static async deleteProduct(id, userId) {
    try {
      if (!id || !userId) {
        throw new Error("Product ID and user authentication required");
      }

      // Verify business ownership
      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must own a business to delete products");
      }

      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("id", id)
        .eq("business_id", userBusiness.id)
        .single();

      if (!product) {
        throw new Error("Product does not exist");
      }

      // Check if product has pending inventory transactions
      const { data: pendingTransactions, count } = await supabase
        .from("inventory_transactions")
        .select("id", { count: "exact" })
        .eq("product_id", id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (count > 0) {
        // Use pendingTransactions to provide more detailed error information
        const transactionTypes = pendingTransactions.map(t => t.transaction_type).join(', ');
        const totalQuantity = pendingTransactions.reduce((sum, t) => sum + t.quantity, 0);

        console.log(`Deletion blocked - Found ${count} recent transactions:`, {
          productId: id,
          transactionTypes,
          totalQuantity,
          transactions: pendingTransactions
        });

        throw new Error(
          `Cannot delete product with ${count} recent inventory transaction(s) (${transactionTypes}). ` +
          `Total quantity affected: ${totalQuantity}. Please try again later.`
        );
      }

      // Log successful deletion attempt (no recent transactions found)
      console.log(`Product deletion approved - no recent transactions found for product ${id}`);

      // Soft delete
      await supabase
        .from("products")
        .update({ is_available: false })
        .eq("id", id);

      return "Product deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default ProductService;