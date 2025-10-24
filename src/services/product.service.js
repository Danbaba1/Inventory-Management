import { supabase } from "../config/supabase.js";
import { ErrorResponse } from "../utils/apiHelpers.js";

/**
 * PRODUCT SERVICE - PostgreSQL/Supabase Implementation
 * Manages product catalog with comprehensive validation and error handling
 * UPDATED: Now uses ErrorResponse for consistent error handling
 */
class ProductService {
  /**
   * Create new product with comprehensive validation
   */
  static async createProduct(
    name,
    categoryId,
    quantity,
    price,
    description,
    userId
  ) {
    // Validate inputs
    if (!name || !name.trim()) {
      throw ErrorResponse.badRequest("Please provide a valid product name");
    }

    if (!categoryId) {
      throw ErrorResponse.badRequest("Please provide a category");
    }

    if (price === undefined || price < 0) {
      throw ErrorResponse.badRequest("Please provide a valid price");
    }

    if (quantity === undefined || quantity < 0) {
      throw ErrorResponse.badRequest("Please provide a valid quantity");
    }

    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    // Verify user has active business
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must register a business before creating products"
      );
    }

    // Validate category belongs to user's business
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", categoryId)
      .eq("business_id", userBusiness.id)
      .eq("is_active", true)
      .single();

    if (categoryError && categoryError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify category");
    }

    if (!category) {
      throw ErrorResponse.notFound("Category does not exist in your business");
    }

    // Check product name uniqueness within business
    const { data: existingProduct, error: checkError } = await supabase
      .from("products")
      .select("id")
      .eq("name", name.trim())
      .eq("business_id", userBusiness.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to check product uniqueness");
    }

    if (existingProduct) {
      throw ErrorResponse.conflict(
        "Product with this name already exists in your business"
      );
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
      .select(
        `
        *,
        category:category_id(id, name, description),
        business:business_id(id, name, type)
      `
      )
      .single();

    if (error) {
      console.error("Product creation error:", error);
      throw ErrorResponse.internal("Failed to create product");
    }

    return {
      message: "Product created successfully",
      product,
    };
  }

  /**
   * Retrieve paginated products with filtering
   */
  static async getProducts(page = 1, limit = 10, userId, filters = {}) {
    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must register a business to view products"
      );
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from("products")
      .select(
        `
        *,
        category:category_id(name, description),
        business:business_id(name, type)
      `,
        { count: "exact" }
      )
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

    if (filters.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice);
    }

    if (filters.lowStock) {
      query = query.lt("quantity", 10);
    }

    const { data: products, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve products");
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const message =
      !products || products.length === 0
        ? "No products to display"
        : "Products retrieved successfully";

    return {
      message,
      products: products || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: count || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get single product by ID
   */
  static async getProductById(productId, userId) {
    if (!productId || !userId) {
      throw ErrorResponse.badRequest(
        "Product ID and user authentication required"
      );
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must own a business to view products"
      );
    }

    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:category_id(id, name, description),
        business:business_id(id, name, type)
      `
      )
      .eq("id", productId)
      .eq("business_id", userBusiness.id)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Product not found");
    }

    if (error) {
      console.error("Product fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve product");
    }

    return { product };
  }

  /**
   * Update existing product
   */
  static async updateProduct(id, updateData, userId) {
    if (!id || !userId) {
      throw ErrorResponse.badRequest(
        "Product ID and user authentication required"
      );
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must own a business to update products"
      );
    }

    // Get current product
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("business_id", userBusiness.id)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Product does not exist");
    }

    if (error) {
      console.error("Product fetch error:", error);
      throw ErrorResponse.internal("Failed to fetch product");
    }

    const { name, description, price, quantity, categoryId } = updateData;

    // Check name uniqueness if changing
    if (name && name !== product.name) {
      const { data: existingProduct, error: checkError } = await supabase
        .from("products")
        .select("id")
        .eq("name", name.trim())
        .eq("business_id", userBusiness.id)
        .neq("id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw ErrorResponse.internal("Failed to check product uniqueness");
      }

      if (existingProduct) {
        throw ErrorResponse.conflict(
          "Product with this name already exists in your business"
        );
      }
    }

    // Validate category if changing
    if (categoryId && categoryId !== product.category_id) {
      const { data: category, error: catError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("business_id", userBusiness.id)
        .eq("is_active", true)
        .single();

      if (catError && catError.code !== "PGRST116") {
        throw ErrorResponse.internal("Failed to verify category");
      }

      if (!category) {
        throw ErrorResponse.notFound(
          "Category does not exist in your business"
        );
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
      .select(
        `
        *,
        category:category_id(name, description),
        business:business_id(name, type)
      `
      )
      .single();

    if (updateError) {
      console.error("Product update error:", updateError);
      throw ErrorResponse.internal("Failed to update product");
    }

    return {
      message: "Product updated successfully",
      product: updatedProduct,
    };
  }

  /**
   * Soft delete product with validation
   */
  static async deleteProduct(id, userId) {
    if (!id || !userId) {
      throw ErrorResponse.badRequest(
        "Product ID and user authentication required"
      );
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must own a business to delete products"
      );
    }

    const { data: product, error } = await supabase
      .from("products")
      .select("id")
      .eq("id", id)
      .eq("business_id", userBusiness.id)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Product does not exist");
    }

    if (error) {
      console.error("Product fetch error:", error);
      throw ErrorResponse.internal("Failed to fetch product");
    }

    // Check for recent transactions (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingTransactions, count, error: countError } =
      await supabase
        .from("inventory_transactions")
        .select("id, transaction_type, quantity", { count: "exact" })
        .eq("product_id", id)
        .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      console.error("Transaction check error:", countError);
      throw ErrorResponse.internal("Failed to verify product transactions");
    }

    if (count > 0) {
      // Provide detailed error information
      const transactionTypes = pendingTransactions
        .map((t) => t.transaction_type)
        .join(", ");
      const totalQuantity = pendingTransactions.reduce(
        (sum, t) => sum + t.quantity,
        0
      );

      console.log(`Deletion blocked - Found ${count} recent transactions:`, {
        productId: id,
        transactionTypes,
        totalQuantity,
        transactions: pendingTransactions,
      });

      throw ErrorResponse.conflict(
        `Cannot delete product with ${count} recent inventory transaction(s) (${transactionTypes}). ` +
          `Total quantity affected: ${totalQuantity}. Please try again later.`
      );
    }

    // Log successful deletion attempt
    console.log(
      `Product deletion approved - no recent transactions found for product ${id}`
    );

    // Soft delete by setting is_available to false
    const { error: deleteError } = await supabase
      .from("products")
      .update({ is_available: false })
      .eq("id", id);

    if (deleteError) {
      console.error("Product deletion error:", deleteError);
      throw ErrorResponse.internal("Failed to delete product");
    }

    return {
      message: "Product deleted successfully",
    };
  }
}

export default ProductService;