import { supabase } from "../config/supabase.js";

/**
 * CATEGORY SERVICE - PostgreSQL/Supabase Implementation
 * Manages product categorization within business context with hierarchical organization
 * Provides CRUD operations for categories with business ownership validation
 * Ensures data integrity through relationship management and soft deletion
 */
class CategoryService {
  /**
   * Create new category within user's business with uniqueness validation
   * Establishes product categorization structure for business inventory management
   * 
   * @param {string} name - Category name (required, must be unique within business)
   * @param {string} description - Category description (optional)
   * @param {string} userId - UUID of the user creating the category (required)
   * 
   * @returns {Object} Creation result with category details and business information
   * @throws {Error} If validation fails, user has no business, or name already exists in business
   * 
   * Business Logic:
   * - Validates user owns an active business before allowing category creation
   * - Ensures category name uniqueness within the business scope (not globally)
   * - Automatically associates category with user's business
   * - Returns category with populated business relationship
   * 
   * Prerequisites:
   * - User must have registered and own an active business
   * - Category name must be unique within the business context
   */
  static async createCategory(name, description, userId) {
    try {
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid category name");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      // Verify user has active business
      const { data: userBusiness, error: businessError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (businessError || !userBusiness) {
        throw new Error(
          "You must register a business before creating categories"
        );
      }

      // Check category name uniqueness within business
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("name", name.trim())
        .eq("business_id", userBusiness.id)
        .single();

      if (existingCategory) {
        throw new Error("Category with this name already exists");
      }

      // Create category
      const { data: category, error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          description: description?.trim(),
          business_id: userBusiness.id,
        })
        .select(`
          *,
          business:business_id(id, name, type)
        `)
        .single();

      if (error) throw error;

      return {
        message: "Category created successfully",
        category,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve categories for user's business with pagination and product information
   * Returns comprehensive category data including associated products for business management
   * 
   * @param {number} page - Page number for pagination (default: 1)
   * @param {number} limit - Number of categories per page (default: 10)
   * @param {string} userId - UUID of the user requesting categories (required)
   * 
   * @returns {Object} Paginated categories with product details and business information
   * @throws {Error} If user authentication fails or user has no active business
   * 
   * Returned Data Structure:
   * - categories: Array of category objects with:
   *   - Basic category information (id, name, description, timestamps)
   *   - business: Associated business details (name, type)
   *   - products: Array of products in this category (id, name, description, availability)
   * - pagination: Standard pagination object with navigation flags
   * 
   * Business Logic:
   * - Only returns categories from user's active business
   * - Only shows active categories (is_active = true)
   * - Includes product information for inventory planning
   * - Orders by creation date (newest first)
   * - Filters products to show availability status
   * 
   * Use Cases:
   * - Business dashboard category overview
   * - Product organization and planning
   * - Category-based inventory management
   */
  static async getCategories(page = 1, limit = 10, userId) {
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
        throw new Error("You must register a business to view categories");
      }

      const offset = (page - 1) * limit;

      // Query categories with products count
      const { data: categories, error, count } = await supabase
        .from("categories")
        .select(`
          *,
          business:business_id(name, type),
          products(id, name, description, is_available)
        `, { count: "exact" })
        .eq("business_id", userBusiness.id)
        .eq("is_active", true)
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        categories,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalCategories: count || 0,
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Update category with business ownership verification and name uniqueness checking
   * Allows partial updates while maintaining data integrity and business context
   * 
   * @param {string} id - UUID of the category to update (required)
   * @param {string} name - New category name (optional, must be unique within business if provided)
   * @param {string} description - New category description (optional, can be empty string)
   * @param {string} userId - UUID of the user attempting the update (required)
   * 
   * @returns {Object} Update result with updated category details and business information
   * @throws {Error} If category not found, user unauthorized, name conflict, or update fails
   * 
   * Business Logic:
   * - Validates user owns the business that contains the category
   * - Checks name uniqueness within business scope if name is being changed
   * - Supports partial updates (only updates provided fields)
   * - Maintains business relationship integrity
   * - Returns updated category with business details
   * 
   * Security Features:
   * - Business ownership verification prevents cross-business modifications
   * - Input sanitization with trimming
   * - Atomic updates to prevent data corruption
   * - Category-business relationship validation
   * 
   * Use Cases:
   * - Category name corrections or rebranding
   * - Description updates for better organization
   * - Category refinement as business evolves
   */
  static async updateCategory(id, name, description, userId) {
    try {
      if (!id || !userId) {
        throw new Error("Category ID and user authentication required");
      }

      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must own a business to update categories");
      }

      const { data: category, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .eq("business_id", userBusiness.id)
        .single();

      if (error || !category) {
        throw new Error("Category does not exist");
      }

      // Check name uniqueness if changing
      if (name && name !== category.name) {
        const { data: existingCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("name", name.trim())
          .eq("business_id", userBusiness.id)
          .neq("id", id)
          .single();

        if (existingCategory) {
          throw new Error("Category with this name already exists");
        }
      }

      const updateObj = {};
      if (name) updateObj.name = name.trim();
      if (description !== undefined) updateObj.description = description?.trim();

      const { data: updatedCategory, error: updateError } = await supabase
        .from("categories")
        .update(updateObj)
        .eq("id", id)
        .select(`
          *,
          business:business_id(name, type)
        `)
        .single();

      if (updateError) throw updateError;

      return {
        message: "Category updated successfully",
        category: updatedCategory,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Soft delete category with relationship validation and cleanup protection
   * Prevents deletion of categories containing products to maintain data integrity
   * 
   * @param {string} id - UUID of the category to delete (required)
   * @param {string} userId - UUID of the user attempting the deletion (required)
   * 
   * @returns {string} Success message confirming category deletion
   * @throws {Error} If category not found, user unauthorized, category has products, or deletion fails
   * 
   * Business Logic:
   * - Validates user owns the business that contains the category
   * - Checks for existing products in the category before allowing deletion
   * - Performs soft deletion by setting is_active = false
   * - Prevents accidental data loss by preserving category data
   * - Provides clear error messages when deletion is blocked
   * 
   * Data Integrity Features:
   * - Relationship validation prevents orphaned products
   * - Soft deletion preserves audit trail and enables recovery
   * - Product count validation with detailed error messaging
   * - Business ownership verification
   * 
   * Use Cases:
   * - Removing unused or obsolete categories
   * - Business restructuring and category consolidation
   * - Cleanup of empty categories
   * 
   * Prerequisites:
   * - Category must be empty (no active products)
   * - User must own the business containing the category
   * 
   * Note: Categories with products cannot be deleted until products are moved or deleted.
   * This prevents accidental loss of product categorization and maintains inventory organization.
   */
  static async deleteCategory(id, userId) {
    try {
      if (!id || !userId) {
        throw new Error("Category ID and user authentication required");
      }

      const { data: userBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (!userBusiness) {
        throw new Error("You must own a business to delete categories");
      }

      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("id", id)
        .eq("business_id", userBusiness.id)
        .single();

      if (!category) {
        throw new Error("Category does not exist");
      }

      // Check if category has products
      const { data: productsInCategory, count } = await supabase
        .from("products")
        .select("id", { count: "exact" })
        .eq("category_id", id)
        .eq("is_available", true);

      if (count > 0) {
        throw new Error(`Cannot delete category. It contains ${count} products. Please move or delete the products first.`);
      }

      // Soft delete
      await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", id);

      return "Category deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default CategoryService;