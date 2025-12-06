/**
 * @fileoverview Category Service - Refactored with Best Practices
 * Manages product categorization with proper error handling and validation
 * UPDATED: Now uses ErrorResponse for consistent error handling
 */

import { supabase } from "../config/supabase.js";
import { ErrorResponse } from "../utils/apiHelpers.js";

class CategoryService {
  /**
   * Create new category with validation and error handling
   */
  static async createCategory(name, description, businessId, userId) {
    // Validate inputs
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ErrorResponse.badRequest('Category name is required');
    }

    if (!userId) {
      throw ErrorResponse.unauthorized('User authentication required');
    }

    if (!businessId) {
      throw ErrorResponse.badRequest('Business ID is required to create category');
    }

    // Verify user has active business
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      console.error('Business verification error:', businessError);
      throw ErrorResponse.internal('Failed to verify business ownership');
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        'You must register a business before creating categories'
      );
    }

    // Check category name uniqueness within business
    const { data: existingCategory, error: checkError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", name.trim())
      .eq("business_id", userBusiness.id)
      .eq("is_active", true)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error('Category uniqueness check error:', checkError);
      throw ErrorResponse.internal('Failed to check category uniqueness');
    }

    if (existingCategory) {
      throw ErrorResponse.conflict('Category with this name already exists');
    }

    // Create category
    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        business_id: userBusiness.id,
        is_active: true,
      })
      .select(`
        *,
        business:business_id(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Category creation error:', error);
      throw ErrorResponse.internal('Failed to create category');
    }

    return category;
  }

  /**
   * Get categories with pagination and proper error handling
   */
  static async getCategories(userId, businessId, filters = {}) {
    if (!userId) {
      throw ErrorResponse.unauthorized('User authentication required');
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      console.error('Business verification error:', businessError);
      throw ErrorResponse.internal('Failed to verify business ownership');
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        'You must register a business to view categories'
      );
    }

    // Get pagination params
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("categories")
      .select(`
        *,
        business:business_id(name, type),
        products(id, name, description, price, quantity, is_available)
      `, { count: "exact" })
      .eq("business_id", userBusiness.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Execute paginated query
    const { data: categories, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Categories fetch error:', error);
      throw ErrorResponse.internal('Failed to retrieve categories');
    }

    // Filter out inactive products
    const filteredCategories = categories?.map(category => ({
      ...category,
      products: category.products?.filter(product => product.is_available !== false) || []
    })) || [];

    return {
      data: filteredCategories,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalRecords: count || 0,
        hasNextPage: page < Math.ceil((count || 0) / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Update category with validation
   */
  static async updateCategory(id, name, description, userId) {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw ErrorResponse.badRequest('Valid Category ID is required');
    }

    if (!userId) {
      throw ErrorResponse.unauthorized('User authentication required');
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      console.error('Business verification error:', businessError);
      throw ErrorResponse.internal('Failed to verify business ownership');
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        'You must own a business to update categories'
      );
    }

    // Verify category exists and belongs to user's business
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .eq("business_id", userBusiness.id)
      .eq("is_active", true)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      throw ErrorResponse.notFound('Category not found');
    }

    if (fetchError) {
      console.error('Category fetch error:', fetchError);
      throw ErrorResponse.internal('Failed to fetch category');
    }

    // Check name uniqueness if changing
    if (name && name.trim() !== category.name) {
      const { data: existingCategory, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("name", name.trim())
        .eq("business_id", userBusiness.id)
        .neq("id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error('Category uniqueness check error:', checkError);
        throw ErrorResponse.internal('Failed to check category uniqueness');
      }

      if (existingCategory) {
        throw ErrorResponse.conflict('Category with this name already exists');
      }
    }

    // Build update object
    const updateObj = {};
    if (name) updateObj.name = name.trim();
    if (description !== undefined) updateObj.description = description?.trim() || null;

    // Update category
    const { data: updatedCategory, error: updateError } = await supabase
      .from("categories")
      .update(updateObj)
      .eq("id", id)
      .select(`
        *,
        business:business_id(name, type)
      `)
      .single();

    if (updateError) {
      console.error('Category update error:', updateError);
      throw ErrorResponse.internal('Failed to update category');
    }

    return updatedCategory;
  }

  /**
   * Delete category with product validation
   */
  static async deleteCategory(id, userId) {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw ErrorResponse.badRequest('Valid Category ID is required');
    }

    if (!userId) {
      throw ErrorResponse.unauthorized('User authentication required');
    }

    // Verify business ownership
    const { data: userBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (businessError && businessError.code !== "PGRST116") {
      console.error('Business verification error:', businessError);
      throw ErrorResponse.internal('Failed to verify business ownership');
    }

    if (!userBusiness) {
      throw ErrorResponse.badRequest(
        'You must own a business to delete categories'
      );
    }

    // Verify category exists
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", id)
      .eq("business_id", userBusiness.id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      throw ErrorResponse.notFound('Category not found');
    }

    if (fetchError) {
      console.error('Category fetch error:', fetchError);
      throw ErrorResponse.internal('Failed to fetch category');
    }

    // Check if category has products
    const { data: productsInCategory, count, error: countError } = await supabase
      .from("products")
      .select("id, name, price, quantity", { count: "exact" })
      .eq("category_id", id)
      .eq("is_available", true);

    if (countError) {
      console.error('Product count error:', countError);
      throw ErrorResponse.internal('Failed to check category products');
    }

    if (count > 0) {
      const totalValue = productsInCategory.reduce(
        (sum, p) => sum + (p.price * p.quantity),
        0
      );

      throw ErrorResponse.badRequest(
        `Cannot delete category containing ${count} products (inventory value: $${totalValue.toFixed(2)}). Please move or delete products first.`
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("categories")
      .update({ is_active: false })
      .eq("id", id);

    if (deleteError) {
      console.error('Category deletion error:', deleteError);
      throw ErrorResponse.internal('Failed to delete category');
    }

    return true;
  }
}

export default CategoryService;