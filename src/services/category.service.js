import Category from "../models/category.model.js";

/**
 * CATEGORY SERVICE
 * Manages product categorization within business context
 * Enforces business ownership and maintains category-business relationships
 */
class CategoryService {
  /**
   * Create new category within user's business
   * 
   * @description Complex workflow ensuring business ownership and category uniqueness
   * 
   * Algorithm:
   * 1. Validate input and authenticate user
   * 2. Verify user has active business (prerequisite)
   * 3. Check category name uniqueness within business scope
   * 4. Create category and establish bidirectional relationships
   * 5. Return structured response with populated data
   * 
   * @param {string} name - Category name (required, trimmed)
   * @param {string} description - Category description (optional, trimmed)
   * @param {string} userId - User ID for business ownership verification
   * 
   * @returns {Object} Creation result with message and category data
   * @throws {Error} Validation, authorization, uniqueness errors
   */
  static async createCategory(name, description, userId) {
    try {
      // Input validation with meaningful error messages
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid category name");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      // Business ownership verification
      // Only users with active businesses can create categories
      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error(
          "You must register a business before creating categories"
        );
      }

      // Business-scoped uniqueness check
      // Categories must be unique within each business
      const existingCategory = await Category.findOne({
        name: name.trim(),
        business: userBusiness._id,
      });

      if (existingCategory) {
        throw new Error("Category with this name already exists");
      }

      // Create category entity
      const category = new Category({
        name: name.trim(),
        description: description?.trim(),
        business: userBusiness._id, // Establish business relationship
      });

      await category.save();

      // Bidirectional relationship: update business's category array
      await Business.findByIdAndUpdate(
        userBusiness._id,
        { $push: { categories: category._id } },
        { new: true }
      );

      // Populate business information for response
      await category.populate("business", "name type");

      // Structured response with relevant data
      return {
        message: "Category created successfully",
        category: {
          id: category._id,
          name: category.name,
          business: category.business,
          description: category.description,
          isActive: category.isActive,
          createdAt: category.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve categories for user's business with pagination
   * 
   * @description Business-scoped category retrieval with pagination support
   * 
   * Algorithm:
   * 1. Authenticate user and verify business ownership
   * 2. Query categories within business scope (active only)
   * 3. Apply pagination and sorting
   * 4. Calculate pagination metadata
   * 
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {string} userId - User ID for business scope determination
   * 
   * @returns {Object} Paginated categories with metadata
   * @throws {Error} Authentication, authorization errors
   */
  static async getCategories(page = 1, limit = 10, userId) {
    try {
      if (!userId) {
        throw new Error("User authentication required");
      }

      // Business ownership verification
      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must register a business to view categories");
      }

      const skip = (page - 1) * limit;

      // Business-scoped query with active filter
      const categories = await Category.find({
        business: userBusiness._id,
        isActive: true,
      })
        .populate("business", "name type")
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1, // Most recent first
        });

      // Count for pagination
      const total = await Category.countDocuments({
        business: userBusiness._id,
        isActive: true,
      });

      return {
        categories,
        pagination: {
          currentPage: page,
          totalPage: Math.ceil(total / limit),
          totalCategories: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Update category with business ownership verification
   * 
   * @description Secure update with name uniqueness checking within business scope
   * 
   * Algorithm:
   * 1. Validate inputs and authenticate user
   * 2. Verify business ownership and category existence
   * 3. Check name uniqueness if name is changing
   * 4. Apply partial updates and return populated result
   * 
   * @param {string} id - Category ObjectId
   * @param {string} name - New category name (optional)
   * @param {string} description - New description (optional)
   * @param {string} userId - User ID for ownership verification
   * 
   * @returns {Object} Update result with success message
   * @throws {Error} Authorization, validation, uniqueness errors
   */
  static async updateCategory(id, name, description, userId) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      // Business ownership verification
      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to update categories");
      }

      // Category existence and ownership verification
      const category = await Category.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!category) {
        throw new Error("Category does not exist");
      }

      // Name uniqueness check (only if changing name)
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name: name.trim(),
          business: userBusiness._id,
          _id: { $ne: id }, // Exclude current category
        });
        if (existingCategory) {
          throw new Error("Category with name already exists");
        }
      }

      // Partial update application
      if (name) category.name = name.trim();
      if (description !== undefined) category.description = description?.trim();

      const updatedCategory = await category.save();
      await updatedCategory.populate("business", "name type");

      return {
        message: "Category updated successfully",
        category: updatedCategory,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Soft delete category with relationship cleanup
   * 
   * @description Implements soft deletion with bidirectional relationship cleanup
   * 
   * Algorithm:
   * 1. Verify ownership and category existence
   * 2. Set category as inactive (soft delete)
   * 3. Remove category reference from business's categories array
   * 4. Preserve category data for potential recovery
   * 
   * @param {string} id - Category ObjectId
   * @param {string} userId - User ID for ownership verification
   * 
   * @returns {string} Success message
   * @throws {Error} Authorization, validation errors
   */
  static async deleteCategory(id, userId) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to delete categories");
      }

      const category = await Category.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!category) {
        throw new Error("Category does not exist");
      }

      // Soft delete implementation
      category.isActive = false;
      await category.save();

      // Cleanup bidirectional relationship
      await Business.findByIdAndUpdate(
        userBusiness._id,
        { $pull: { categories: category._id } },
        { new: true }
      );

      return "Category deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default CategoryService;
