import { supabase } from "../config/supabase.js";

/**
 * CATEGORY SERVICE - Fixed for PostgreSQL/Supabase
 * Manages product categorization within business context
 */
class CategoryService {
  /**
   * Create new category within user's business
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
   * Retrieve categories for user's business with pagination
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
   * Update category with business ownership verification
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
   * Soft delete category with relationship cleanup
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