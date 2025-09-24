import { supabase } from "../config/supabase.js";

/**
 * INVENTORY SERVICE - PostgreSQL/Supabase Implementation
 * Manages product inventory with complete audit trail using stored procedures
 * Provides atomic operations for inventory management with business authorization
 * FIXED: Now filters out products from deleted categories in history queries
 */
class InventoryService {
  /**
   * Increment product quantity with audit logging
   * Creates a TOP_UP transaction using atomic stored procedure
   */
  static async incrementQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
  ) {
    try {
      if (!productId || !quantity || !userId) {
        throw new Error("Product ID, quantity, and user ID are required");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      // Get product with business info for verification
      const { data: product, error } = await supabase
        .from("products")
        .select(
          `
          *,
          business:business_id(id, name, owner_id),
          category:category_id(id, name, description, is_active)
        `
        )
        .eq("id", productId)
        .single();

      if (error || !product) {
        throw new Error("Product not found");
      }

      // Check if category is deleted
      if (!product.category || !product.category.is_active) {
        throw new Error("Cannot modify product - category has been deleted");
      }

      // Verify user owns the business
      if (product.business.owner_id !== userId) {
        throw new Error("You are not authorized to modify this product");
      }

      const oldQuantity = product.quantity;
      const newQuantity = oldQuantity + Number(quantity);

      // Use stored procedure for atomic operation
      const { data: transactionData, error: transactionError } =
        await supabase.rpc("increment_product_quantity", {
          p_product_id: productId,
          p_business_id: product.business.id,
          p_user_id: userId,
          p_old_quantity: oldQuantity,
          p_new_quantity: newQuantity,
          p_quantity_changed: Number(quantity),
          p_reason: reason || "Stock replenishment",
          p_reference_id: referenceId,
        });

      if (transactionError) {
        console.error("Stored procedure error:", transactionError);
        throw transactionError;
      }

      return {
        message: "Quantity added successfully",
        transaction: {
          productId: product.id,
          productName: product.name,
          oldQuantity,
          newQuantity,
          quantityChanged: Number(quantity),
          transactionType: "TOP_UP",
          transactionId: transactionData,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Decrement product quantity with stock validation and audit logging
   * Creates a USAGE transaction using atomic stored procedure
   */
  static async decrementQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
  ) {
    try {
      if (!productId || !quantity || !userId) {
        throw new Error("Product ID, quantity, and user ID are required");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      // Get product with business info
      const { data: product, error } = await supabase
        .from("products")
        .select(
          `
          *,
          business:business_id(id, name, owner_id),
          category:category_id(id, name, description, is_active)
        `
        )
        .eq("id", productId)
        .single();

      if (error || !product) {
        throw new Error("Product not found");
      }

      // Check if category is deleted
      if (!product.category || !product.category.is_active) {
        throw new Error("Cannot modify product - category has been deleted");
      }

      // Verify user owns the business
      if (product.business.owner_id !== userId) {
        throw new Error("You are not authorized to modify this product");
      }

      if (product.quantity < quantity) {
        throw new Error(
          `Insufficient quantity available. Current stock: ${product.quantity}`
        );
      }

      const oldQuantity = product.quantity;
      const newQuantity = oldQuantity - Number(quantity);

      // Use stored procedure for atomic operation
      const { data: transactionData, error: transactionError } =
        await supabase.rpc("decrement_product_quantity", {
          p_product_id: productId,
          p_business_id: product.business.id,
          p_user_id: userId,
          p_old_quantity: oldQuantity,
          p_new_quantity: newQuantity,
          p_quantity_changed: Number(quantity),
          p_reason: reason || "Stock usage",
          p_reference_id: referenceId,
        });

      if (transactionError) {
        console.error("Stored procedure error:", transactionError);
        throw transactionError;
      }

      return {
        message: "Quantity removed successfully",
        transaction: {
          productId: product.id,
          productName: product.name,
          oldQuantity,
          newQuantity,
          quantityChanged: Number(quantity),
          transactionType: "USAGE",
          transactionId: transactionData,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get complete inventory transaction history for a specific product
   * FIXED: Now filters out transactions for products in deleted categories
   */
  static async getProductInventoryHistory(productId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        transactionType,
        startDate,
        endDate,
      } = options;

      if (!productId) {
        throw new Error("Product ID is required");
      }

      const offset = (page - 1) * limit;

      // First, check if the product's category is active
      const { data: productCheck, error: productError } = await supabase
        .from("products")
        .select(`
          id,
          category:category_id(is_active)
        `)
        .eq("id", productId)
        .single();

      if (productError || !productCheck) {
        throw new Error("Product not found");
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

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (transactionType) {
        query = query.eq("transaction_type", transactionType);
      }

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        query = query.lte("created_at", new Date(endDate).toISOString());
      }

      const {
        data: transactions,
        error,
        count,
      } = await query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out transactions where category is inactive (additional safety check)
      const filteredTransactions = transactions?.filter(
        transaction => 
          transaction.product && 
          transaction.product.category && 
          transaction.product.category.is_active
      ) || [];

      let message;
      if (!filteredTransactions || filteredTransactions.length === 0) {
        message = "No product inventory history to display";
      } else {
        message = "Product inventory history retrieved successfully";
      }

      return {
        message,
        transactions: filteredTransactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((filteredTransactions.length || 0) / limit),
          totalRecords: filteredTransactions.length || 0,
          hasNextPage: page < Math.ceil((filteredTransactions.length || 0) / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get comprehensive inventory history for all products in a business
   * FIXED: Now filters out transactions for products in deleted categories
   */
  static async getBusinessInventoryHistory(options = {}) {
    try {
      const {
        userId,
        page = 1,
        limit = 10,
        transactionType,
        startDate,
        endDate,
        categoryId,
      } = options;

      if (!userId) {
        throw new Error("User ID is required");
      }

      // Verify user has active business
      const { data: userBusiness, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, type")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (businessError || !userBusiness) {
        throw new Error("You must own a business to view inventory history");
      }

      const offset = (page - 1) * limit;

      // Build the query for inventory transactions with full relationships
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
        query = query.eq("transaction_type", transactionType);
      }

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        query = query.lte("created_at", new Date(endDate).toISOString());
      }

      // Filter by category if specified (and category is active)
      if (categoryId) {
        // First verify the category exists and is active
        const { data: categoryCheck, error: categoryError } = await supabase
          .from("categories")
          .select("id, is_active")
          .eq("id", categoryId)
          .eq("business_id", userBusiness.id)
          .single();

        if (categoryError || !categoryCheck || !categoryCheck.is_active) {
          // Category doesn't exist or is deleted
          return {
            message: "No business inventory history to display - category not found or deleted",
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
          // No products in this category
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

      const {
        data: transactions,
        error,
        count,
      } = await query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out transactions where category is inactive
      const activeTransactions = transactions?.filter(
        transaction => 
          transaction.product && 
          transaction.product.category && 
          transaction.product.category.is_active
      ) || [];

      let message;
      if (!activeTransactions || activeTransactions.length === 0) {
        message = "No business inventory history to display";
      } else {
        message = "Business inventory history retrieved successfully";
      }

      // Group transactions by category (only active categories)
      const categoriesMap = new Map();

      activeTransactions?.forEach((transaction) => {
        if (!transaction.product || !transaction.product.category || !transaction.product.category.is_active) return;

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

      // Convert maps to arrays for response
      const categories = Array.from(categoriesMap.values()).map((category) => ({
        ...category,
        products: Array.from(category.products.values()),
      }));

      return {
        message,
        business: userBusiness,
        categories,
        totalTransactions: activeTransactions.length || 0,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((activeTransactions.length || 0) / limit),
          totalRecords: activeTransactions.length || 0,
          hasNextPage: page < Math.ceil((activeTransactions.length || 0) / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default InventoryService;