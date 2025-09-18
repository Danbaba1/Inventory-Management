import { supabase } from "../config/supabase.js";

/**
 * INVENTORY SERVICE - Fixed for PostgreSQL/Supabase
 * Manages product inventory with complete audit trail using stored procedures
 */
class InventoryService {
  /**
   * Increment product quantity with audit logging
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
          business:business_id(id, name, owner_id)
        `
        )
        .eq("id", productId)
        .single();

      if (error || !product) {
        throw new Error("Product not found");
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
   * Decrement product quantity with stock validation
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
          business:business_id(id, name, owner_id)
        `
        )
        .eq("id", productId)
        .single();

      if (error || !product) {
        throw new Error("Product not found");
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
   * Get complete inventory history with optional filtering
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

      let query = supabase
        .from("inventory_transactions")
        .select(
          `
          *,
          product:product_id(name,
           description,
           category:category_id(
           id,
           name,
           description)),
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

      return {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalRecords: count || 0,
          hasNextPage: page < Math.ceil((count || 0) / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get complete inventory history for all products in a business,
   * organized by categories
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
            description
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

      // Filter by category if specified
      if (categoryId) {
        // First get products in the category
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

      // Group transactions by category
      const categoriesMap = new Map();

      transactions?.forEach((transaction) => {
        if (!transaction.product || !transaction.product.category) return;

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
        business: userBusiness,
        categories,
        totalTransactions: count || 0,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalRecords: count || 0,
          hasNextPage: page < Math.ceil((count || 0) / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default InventoryService;
