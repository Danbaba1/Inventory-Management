import { supabase } from "../config/supabase.js";

/**
 * PRODUCT SERVICE - Fixed for PostgreSQL/Supabase
 * Manages product catalog within business and category context
 */
class ProductService {
  /**
   * Create new product within user's business and category
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
   * Retrieve paginated products for user's business
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

      return {
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
   * Get a single product by ID with ownership verification
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
   * Update existing product within user's business
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
   * Soft delete product by setting is_available to false
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
        throw new Error("Cannot delete product with recent inventory activity. Please try again later.");
      }

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