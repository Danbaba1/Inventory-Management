import { supabase } from "../config/supabase.js";
import { ErrorResponse } from "../utils/apiHelpers.js";

/**
 * BUSINESS SERVICE - PostgreSQL/Supabase Implementation
 * Core business entity management with comprehensive CRUD operations
 * UPDATED: Now uses ErrorResponse for consistent error handling
 */
class BusinessService {
  /**
   * Register a new business entity with uniqueness validation
   */
  static async registerBusiness(businessData, userId) {
    const {
      name,
      type,
      description = "",
      address = {},
      contactInfo = {},
    } = businessData;

    // Validate required fields
    if (!name || !type) {
      throw ErrorResponse.badRequest("Please provide both name and type");
    }

    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    // Check for business name uniqueness across active businesses
    const { data: existingBusiness, error: checkError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("name", name.trim())
      .eq("is_active", true)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to check business uniqueness");
    }

    if (existingBusiness) {
      throw ErrorResponse.conflict("Business with this name already exists");
    }

    // Create new business
    const { data: newBusiness, error } = await supabase
      .from("businesses")
      .insert({
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
        address: address,
        contact_info: contactInfo,
        owner_id: userId,
        is_active: true,
      })
      .select(
        `
        *,
        owner:owner_id(name, email)
      `
      )
      .single();

    if (error) {
      console.error("Business creation error:", error);
      throw ErrorResponse.internal("Failed to register business");
    }

    return {
      message: "Business registered successfully",
      business: newBusiness,
    };
  }

  /**
   * Retrieve businesses with comprehensive filtering and pagination
   */
  static async getBusinesses(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;

    let query = supabase
      .from("businesses")
      .select(
        `
        *,
        owner:owner_id(name, email),
        categories:categories!business_id(id, name, description, is_active)
      `,
        { count: "exact" }
      )
      .eq("is_active", true);

    // Apply filters
    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.owner) {
      query = query.eq("owner_id", filters.owner);
    }

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data: businesses, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Businesses fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve businesses");
    }

    // Filter out inactive categories and fetch products for each active category
    const filteredBusinesses = await Promise.all(
      businesses?.map(async (business) => {
        // Filter active categories
        const activeCategories =
          business.categories?.filter(
            (category) => category.is_active !== false
          ) || [];

        // Fetch products for each active category
        const categoriesWithProducts = await Promise.all(
          activeCategories.map(async (category) => {
            const { data: products, error: productsError } = await supabase
              .from("products")
              .select(
                "id, name, description, price, quantity, is_available"
              )
              .eq("category_id", category.id)
              .eq("is_available", true);

            if (productsError) {
              console.error("Products fetch error:", productsError);
              // Return category without products on error
              return { ...category, products: [] };
            }

            return {
              ...category,
              products: products || [],
            };
          })
        );

        return {
          ...business,
          categories: categoriesWithProducts,
        };
      }) || []
    );

    const totalPages = Math.ceil((count || 0) / limit);
    const message =
      !businesses || businesses.length === 0
        ? "No businesses to display"
        : "Businesses retrieved successfully";

    return {
      message,
      businesses: filteredBusinesses,
      pagination: {
        currentPage: page,
        totalPages,
        totalBusinesses: count || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update existing business with ownership verification and data validation
   */
  static async updateBusiness(id, updateData, userId) {
    if (!id) {
      throw ErrorResponse.badRequest("Please provide your business ID");
    }

    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    // Fetch and verify ownership
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Business does not exist");
    }

    if (error) {
      console.error("Business fetch error:", error);
      throw ErrorResponse.internal("Failed to fetch business");
    }

    if (!business.is_active) {
      throw ErrorResponse.badRequest("Cannot update deactivated business");
    }

    if (business.owner_id !== userId) {
      throw ErrorResponse.forbidden(
        "You are not authorized to update this business"
      );
    }

    const { name, type, description, address, contactInfo } = updateData;

    // Check name uniqueness if changing
    if (name && name !== business.name) {
      const { data: existingBusiness, error: checkError } = await supabase
        .from("businesses")
        .select("id")
        .eq("name", name.trim())
        .eq("is_active", true)
        .neq("id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw ErrorResponse.internal("Failed to check business uniqueness");
      }

      if (existingBusiness) {
        throw ErrorResponse.conflict(
          "Business with this name already exists"
        );
      }
    }

    // Prepare update object
    const updateObj = {};
    if (name) updateObj.name = name.trim();
    if (type) updateObj.type = type.trim();
    if (description !== undefined)
      updateObj.description = description.trim();
    if (address !== undefined) {
      updateObj.address = { ...business.address, ...address };
    }
    if (contactInfo !== undefined) {
      updateObj.contact_info = { ...business.contact_info, ...contactInfo };
    }

    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update(updateObj)
      .eq("id", id)
      .select(
        `
          *,
          owner:owner_id(name, email)
        `
      )
      .single();

    if (updateError) {
      console.error("Business update error:", updateError);
      throw ErrorResponse.internal("Failed to update business");
    }

    return {
      message: "Business updated successfully",
      business: updatedBusiness,
    };
  }

  /**
   * Soft delete business with ownership verification
   */
  static async deleteBusiness(id, userId) {
    if (!id) {
      throw ErrorResponse.badRequest("Business ID is required");
    }

    if (!userId) {
      throw ErrorResponse.unauthorized("User authentication required");
    }

    const { data: business, error } = await supabase
      .from("businesses")
      .select("owner_id, is_active")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Business does not exist");
    }

    if (error) {
      console.error("Business fetch error:", error);
      throw ErrorResponse.internal("Failed to fetch business");
    }

    if (!business.is_active) {
      throw ErrorResponse.badRequest("Business is already deactivated");
    }

    if (business.owner_id !== userId) {
      throw ErrorResponse.forbidden(
        "You are not authorized to delete this business"
      );
    }

    // Deactivate all associated products
    const { error: productsError } = await supabase
      .from("products")
      .update({ is_available: false })
      .eq("business_id", id);

    if (productsError) {
      console.error("Products deactivation error:", productsError);
      throw ErrorResponse.internal("Failed to deactivate business products");
    }

    // Deactivate all associated categories
    const { error: categoriesError } = await supabase
      .from("categories")
      .update({ is_active: false })
      .eq("business_id", id);

    if (categoriesError) {
      console.error("Categories deactivation error:", categoriesError);
      throw ErrorResponse.internal("Failed to deactivate business categories");
    }

    // Deactivate the business
    const { error: businessError } = await supabase
      .from("businesses")
      .update({ is_active: false })
      .eq("id", id);

    if (businessError) {
      console.error("Business deactivation error:", businessError);
      throw ErrorResponse.internal("Failed to deactivate business");
    }

    return {
      message: "Business and all associated data deactivated successfully",
    };
  }
}

export default BusinessService;