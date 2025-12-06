import { supabase } from "../config/supabase.js";
import { ErrorResponse } from "../utils/apiHelpers.js";
import {
  incrementProductQuantity,
  decrementProductQuantity,
} from "../utils/inventoryOperations.js";

/**
 * INVENTORY SERVICE - PostgreSQL/Supabase Implementation
 * Manages product inventory with complete audit trail using stored procedures
 * Provides atomic operations for inventory management with business authorization
 * UPDATED: Now uses ErrorResponse for consistent error handling
 * REFACTORED: Increment/Decrement operations extracted to separate utility file
 */
class InventoryService {
  /**
   * Increment product quantity with audit logging
   * Delegates to reusable utility function
   */
  static async incrementQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
  ) {
    return incrementProductQuantity(
      productId,
      quantity,
      userId,
      reason,
      referenceId
    );
  }

  /**
   * Decrement product quantity with stock validation and audit logging
   * Delegates to reusable utility function
   */
  static async decrementQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
  ) {
    return decrementProductQuantity(
      productId,
      quantity,
      userId,
      reason,
      referenceId
    );
  }

  /**
   * Get complete inventory transaction history for a specific product
   * Filters out transactions for products in deleted categories
   */
  static async getProductInventoryHistory(productId, options = {}) {
    const {
      page = 1,
      limit = 10,
      userId,
      transactionType,
      startDate,
      endDate,
    } = options;

    if (!productId) {
      throw ErrorResponse.badRequest("Product ID is required");
    }

    const offset = (page - 1) * limit;

    console.log(`Fetching product: ${productId}`);

    // Check if the product's category is active
    const { data: productCheck, error: productError } = await supabase
      .from("products")
      .select(
        `
        id,
        category:category_id(is_active)
      `
      )
      .eq("id", productId)
      .single();

    if (productError && productError.code === "PGRST116") {
      throw ErrorResponse.notFound("Product not found");
    }

    if (productError) {
      console.error("Product check error:", {
        message: productError.message,
        details: productError.details,
        hint: productError.hint,
        code: productError.code,
      });
      throw ErrorResponse.internal("Failed to verify product");
    }

    // If category is deleted, return empty results
    if (!productCheck.category || !productCheck.category.is_active) {
      return {
        message: "No product inventory history to display - category has been deleted",
        transactions: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalRecords: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    console.log(`Fetching transactions for product: ${productId}`);

    let query = supabase
      .from("inventory_transactions")
      .select(
        `
        *,
        product:product_id(
          name,
          description,
          category:category_id(
            id,
            name,
            description,
            is_active
          )
        ),
        user:user_id(name, email),
        business:business_id(name, type)
      `,
        { count: "exact" }
      )
      .eq("product_id", productId);

    // Apply filters
    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (transactionType) {
      if (!["TOP_UP", "USAGE"].includes(transactionType)) {
        throw ErrorResponse.badRequest(
          "Transaction type must be either 'TOP_UP' or 'USAGE'"
        );
      }
      query = query.eq("transaction_type", transactionType);
    }

    if (startDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", new Date(endDate).toISOString());
    }

    const { data: transactions, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Transaction history fetch error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw ErrorResponse.internal("Failed to retrieve inventory history");
    }

    // Filter out transactions where category is inactive
    const filteredTransactions =
      transactions?.filter(
        (transaction) =>
          transaction.product &&
          transaction.product.category &&
          transaction.product.category.is_active
      ) || [];

    const message =
      !filteredTransactions || filteredTransactions.length === 0
        ? "No product inventory history to display"
        : "Product inventory history retrieved successfully";

    return {
      message,
      transactions: filteredTransactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((filteredTransactions.length || 0) / limit),
        totalRecords: filteredTransactions.length || 0,
        hasNextPage:
          page < Math.ceil((filteredTransactions.length || 0) / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get comprehensive inventory history for all products in a business
   * Filters out transactions for products in deleted categories
   */
  static async getBusinessInventoryHistory(options = {}) {
    const {
      userId,
      page = 1,
      limit = 10,
      transactionType,
      startDate,
      endDate,
      categoryId,
      businessId,
    } = options;

    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    // Verify user has active business
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, type")
      .eq("id", businessId)
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to verify business ownership");
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        "You must own a business to view inventory history"
      );
    }

    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from("inventory_transactions")
      .select(
        `
      id,
      transaction_type,
      old_quantity,
      new_quantity,
      quantity_changed,
      reason,
      reference_id,
      created_at,
      updated_at,
      product:product_id(
        id,
        name,
        description,
        price,
        quantity,
        category:category_id(
          id,
          name,
          description,
          is_active
        )
      ),
      user:user_id(
        id,
        name,
        email
      )
    `,
        { count: "exact" }
      )
      .eq("business_id", userBusiness.id);

    // Apply filters
    if (transactionType) {
      if (!["TOP_UP", "USAGE"].includes(transactionType)) {
        throw ErrorResponse.badRequest(
          "Transaction type must be either 'TOP_UP' or 'USAGE'"
        );
      }
      query = query.eq("transaction_type", transactionType);
    }

    if (startDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", new Date(endDate).toISOString());
    }

    // Filter by category if specified
    if (categoryId) {
      const { data: categoryCheck, error: categoryError } = await supabase
        .from("categories")
        .select("id, is_active")
        .eq("id", categoryId)
        .eq("business_id", userBusiness.id)
        .single();

      if (categoryError && categoryError.code !== "PGRST116") {
        throw ErrorResponse.internal("Failed to verify category");
      }

      if (!categoryCheck || !categoryCheck.is_active) {
        return {
          message:
            "No business inventory history to display - category not found or deleted",
          business: userBusiness,
          categories: [],
          totalTransactions: 0,
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      // Get products in the active category
      const { data: categoryProducts } = await supabase
        .from("products")
        .select("id")
        .eq("category_id", categoryId)
        .eq("business_id", userBusiness.id);

      if (categoryProducts && categoryProducts.length > 0) {
        const productIds = categoryProducts.map((p) => p.id);
        query = query.in("product_id", productIds);
      } else {
        return {
          message: "No business inventory history to display",
          business: userBusiness,
          categories: [],
          totalTransactions: 0,
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    }

    const { data: transactions, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Business inventory fetch error:", error);
      throw ErrorResponse.internal(
        "Failed to retrieve business inventory history"
      );
    }

    // Filter out transactions where category is inactive
    const activeTransactions =
      transactions?.filter(
        (transaction) =>
          transaction.product &&
          transaction.product.category &&
          transaction.product.category.is_active
      ) || [];

    const message =
      !activeTransactions || activeTransactions.length === 0
        ? "No business inventory history to display"
        : "Business inventory history retrieved successfully";

    // Group transactions by category
    const categoriesMap = new Map();

    activeTransactions?.forEach((transaction) => {
      if (
        !transaction.product ||
        !transaction.product.category ||
        !transaction.product.category.is_active
      )
        return;

      const category = transaction.product.category;
      const categoryKey = category.id;

      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          id: category.id,
          name: category.name,
          description: category.description,
          products: new Map(),
          totalTransactions: 0,
        });
      }

      const categoryData = categoriesMap.get(categoryKey);
      const productKey = transaction.product.id;

      if (!categoryData.products.has(productKey)) {
        categoryData.products.set(productKey, {
          id: transaction.product.id,
          name: transaction.product.name,
          description: transaction.product.description,
          price: transaction.product.price,
          currentQuantity: transaction.product.quantity,
          transactions: [],
        });
      }

      categoryData.products.get(productKey).transactions.push({
        id: transaction.id,
        transactionType: transaction.transaction_type,
        oldQuantity: transaction.old_quantity,
        newQuantity: transaction.new_quantity,
        quantityChanged: transaction.quantity_changed,
        reason: transaction.reason,
        referenceId: transaction.reference_id,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
        user: transaction.user,
      });

      categoryData.totalTransactions++;
    });

    // Convert maps to arrays
    const categories = Array.from(categoriesMap.values()).map((category) => ({
      ...category,
      products: Array.from(category.products.values()),
    }));

    return {
      message,
      business: userBusiness,
      categories,
      transactions: activeTransactions.length || 0,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((activeTransactions.length || 0) / limit),
        totalRecords: activeTransactions.length || 0,
        hasNextPage:
          page < Math.ceil((activeTransactions.length || 0) / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}

export default InventoryService;