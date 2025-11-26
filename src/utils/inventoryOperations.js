import { supabase } from "../config/supabase.js";
import { ErrorResponse } from "../utils/apiHelpers.js";

/**
 * INVENTORY OPERATIONS UTILITY
 * Reusable functions for incrementing and decrementing product quantities
 * Can be used across different services and contexts
 */

/**
 * Increment product quantity with audit logging
 * Creates a TOP_UP transaction using atomic stored procedure
 * 
 * @param {string} productId - The product ID
 * @param {number} quantity - Amount to increment
 * @param {string} userId - User performing the operation
 * @param {string|null} reason - Optional reason for increment
 * @param {string|null} referenceId - Optional reference ID
 * @returns {Object} Transaction details
 */
export async function incrementProductQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
) {
    // Validate required parameters
    if (!productId || !quantity || !userId) {
        throw ErrorResponse.badRequest(
            "Product ID, quantity, and user ID are required"
        );
    }

    if (quantity <= 0) {
        throw ErrorResponse.badRequest("Quantity must be greater than 0");
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

    if (error && error.code === "PGRST116") {
        throw ErrorResponse.notFound("Product not found");
    }

    if (error) {
        console.error("Product fetch error:", error);
        throw ErrorResponse.internal("Failed to fetch product");
    }

    // Check if category is deleted
    if (!product.category || !product.category.is_active) {
        throw ErrorResponse.badRequest(
            "Cannot modify product - category has been deleted"
        );
    }

    // Verify user owns the business
    if (product.business.owner_id !== userId) {
        throw ErrorResponse.forbidden(
            "You are not authorized to modify this product"
        );
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
        throw ErrorResponse.internal("Failed to increment product quantity");
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
}

/**
 * Decrement product quantity with stock validation and audit logging
 * Creates a USAGE transaction using atomic stored procedure
 * 
 * @param {string} productId - The product ID
 * @param {number} quantity - Amount to decrement
 * @param {string} userId - User performing the operation
 * @param {string|null} reason - Optional reason for decrement
 * @param {string|null} referenceId - Optional reference ID
 * @returns {Object} Transaction details
 */
export async function decrementProductQuantity(
    productId,
    quantity,
    userId,
    reason = null,
    referenceId = null
) {
    // Validate required parameters
    if (!productId || !quantity || !userId) {
        throw ErrorResponse.badRequest(
            "Product ID, quantity, and user ID are required"
        );
    }

    if (quantity <= 0) {
        throw ErrorResponse.badRequest("Quantity must be greater than 0");
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

    if (error && error.code === "PGRST116") {
        throw ErrorResponse.notFound("Product not found");
    }

    if (error) {
        console.error("Product fetch error:", error);
        throw ErrorResponse.internal("Failed to fetch product");
    }

    // Check if category is deleted
    if (!product.category || !product.category.is_active) {
        throw ErrorResponse.badRequest(
            "Cannot modify product - category has been deleted"
        );
    }

    // Verify user owns the business
    if (product.business.owner_id !== userId) {
        throw ErrorResponse.forbidden(
            "You are not authorized to modify this product"
        );
    }

    // Check sufficient stock
    if (product.quantity < quantity) {
        throw ErrorResponse.badRequest(
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
        throw ErrorResponse.internal("Failed to decrement product quantity");
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
}