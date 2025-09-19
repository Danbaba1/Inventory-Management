import { supabase } from "../config/supabase.js";

/**
 * BUSINESS SERVICE - PostgreSQL/Supabase Implementation
 * Core business entity management with comprehensive CRUD operations
 * Handles business registration, retrieval, updates, and soft deletion
 * Provides ownership verification and data validation for all operations
 */
class BusinessService {
  /**
   * Register a new business entity with uniqueness validation
   * Creates a business owned by the specified user with structured data storage
   * 
   * @param {Object} businessData - Business information object
   * @param {string} businessData.name - Business name (required, must be unique)
   * @param {string} businessData.type - Business type/category (required)
   * @param {string} businessData.description - Business description (optional, defaults to empty string)
   * @param {Object} businessData.address - Address information as JSON object (optional, defaults to empty object)
   * @param {Object} businessData.contactInfo - Contact information as JSON object (optional, defaults to empty object)
   * @param {string} userId - UUID of the user registering the business (required)
   * 
   * @returns {Object} Registration result with business details and owner information
   * @throws {Error} If required fields missing, business name already exists, or database operation fails
   * 
   * Business Logic:
   * - Validates required fields (name, type, userId)
   * - Checks business name uniqueness across all businesses
   * - Stores address and contact info as JSON objects for flexible structure
   * - Sets business as active by default
   * - Returns business data with populated owner relationship
   */
  static async registerBusiness(businessData, userId) {
    try {
      const {
        name,
        type,
        description = "",
        address = {},
        contactInfo = {},
      } = businessData;

      if (!name || !type) {
        throw new Error("Please provide both name and type");
      }

      if (!userId) {
        throw new Error("User ID is required to register a business");
      }

      // Check uniqueness
      const { data: existingBusiness } = await supabase
        .from("businesses")
        .select("id, name, is_active, owner_id")
        .eq("name", name.trim())
        .single();

      if (existingBusiness) {
        if (existingBusiness.is_active) {
          // Active business with same name exists
          throw new Error("Business with this name already exists");
        } else {
          // Check if the deactivated business belongs to the same user
          if (existingBusiness.owner_id === userId) {
            // User is reactivating their own deactivated business
            const { data: reactivatedBusiness, error: reactivateError } = await supabase
              .from("businesses")
              .update({
                is_active: true,
                type: type.trim(),
                description: description.trim(),
                address: address,
                contact_info: contactInfo,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingBusiness.id)
              .select(`
              *,
              owner:owner_id(name, email)
              `)
              .single();

            if (reactivateError) throw reactivateError;

            return {
              message: "Business reactivated successfully",
              business: reactivatedBusiness,
            };
          } else {
            // Different user trying to use name of deactivated business
            throw new Error("Business with this name already exists");
          }
        }
      }


      // No existing business found, create new one
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
        .select(`
          *,
          owner:owner_id(name, email)
        `)
        .single();

      if (error) throw error;

      return {
        message: "Business registered successfully",
        business: newBusiness,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve businesses with comprehensive filtering and pagination
   * Returns paginated list of active businesses with owner details, categories, and product counts
   * 
   * @param {number} page - Page number for pagination (default: 1)
   * @param {number} limit - Number of businesses per page (default: 10)
   * @param {Object} filters - Optional filtering criteria
   * @param {string} filters.type - Filter by business type
   * @param {string} filters.owner - Filter by owner UUID
   * @param {string} filters.search - Search in business name and description (case-insensitive)
   * 
   * @returns {Object} Paginated businesses with metadata
   * @throws {Error} If database query fails
   * 
   * Returned Data Structure:
   * - businesses: Array of business objects with:
   *   - Basic business information (name, type, description, address, contact_info)
   *   - owner: Owner details (name, email)
   *   - categories: Array of associated categories
   *   - _count: Product count for the business
   * - pagination: Object with navigation and count information
   * 
   * Features:
   * - Only returns active businesses (is_active = true)
   * - Supports text search across name and description fields
   * - Includes related data for comprehensive business profiles
   * - Orders by creation date (newest first)
   */
  static async getBusinesses(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from("businesses")
        .select(`
          *,
          owner:owner_id(name, email),
          categories:categories!business_id(id, name, description),
          _count:products(count)
        `, { count: "exact" })
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

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        businesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalBusinesses: count || 0,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Update existing business with ownership verification and data validation
   * Allows partial updates with automatic data merging for complex fields
   * 
   * @param {string} id - UUID of the business to update (required)
   * @param {Object} updateData - Fields to update
   * @param {string} updateData.name - New business name (optional, must be unique if provided)
   * @param {string} updateData.type - New business type (optional)
   * @param {string} updateData.description - New description (optional)
   * @param {Object} updateData.address - Address updates (optional, merged with existing)
   * @param {Object} updateData.contactInfo - Contact info updates (optional, merged with existing)
   * @param {string} userId - UUID of the user attempting the update (required)
   * 
   * @returns {Object} Update result with updated business details
   * @throws {Error} If business not found, user unauthorized, name conflict, or update fails
   * 
   * Business Logic:
   * - Validates business exists and user owns it
   * - Checks name uniqueness if name is being changed
   * - Merges address and contact_info objects with existing data (preserves fields not being updated)
   * - Only updates provided fields (partial updates supported)
   * - Returns updated business with owner relationship populated
   * 
   * Security Features:
   * - Ownership verification prevents unauthorized updates
   * - Input sanitization (trimming whitespace)
   * - Atomic updates to prevent data corruption
   */
  static async updateBusiness(id, updateData, userId) {
    try {
      if (!id) {
        throw new Error("Please provide your business ID");
      }

      // Fetch and verify ownership
      const { data: business, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !business) {
        throw new Error("Business does not exist");
      }

      if (!business.is_active) {
        throw new Error("Cannot update deactivated business");
      }

      if (business.owner_id !== userId) {
        throw new Error("You are not authorized to update this business");
      }

      const { name, type, description, address, contactInfo } = updateData;

      // Check name uniqueness if changing
      if (name && name !== business.name) {
        const { data: existingBusiness } = await supabase
          .from("businesses")
          .select("id")
          .eq("name", name.trim())
          .eq("is_active", true)
          .neq("id", id)
          .single();

        if (existingBusiness) {
          throw new Error("Business with this name already exists");
        }
      }

      // Prepare update object
      const updateObj = {};
      if (name) updateObj.name = name.trim();
      if (type) updateObj.type = type.trim();
      if (description !== undefined) updateObj.description = description.trim();
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
        .select(`
          *,
          owner:owner_id(name, email)
        `)
        .single();

      if (updateError) throw updateError;

      return {
        message: "Business updated successfully",
        business: updatedBusiness,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Soft delete business with ownership verification
   * Deactivates business instead of permanent deletion to preserve data integrity
   * 
   * @param {string} id - UUID of the business to delete (required)
   * @param {string} userId - UUID of the user attempting the deletion (required)
   * 
   * @returns {string} Success message confirming deactivation
   * @throws {Error} If business not found, user unauthorized, or deletion fails
   * 
   * Business Logic:
   * - Verifies business exists and user owns it
   * - Performs soft deletion by setting is_active = false
   * - Preserves all business data for potential recovery
   * - Related entities (products, categories) remain linked but inherit inactive status
   * 
   * Security Features:
   * - Ownership verification prevents unauthorized deletions
   * - Soft deletion prevents accidental data loss
   * - Maintains referential integrity with related entities
   * 
   * Note: This is a soft delete operation. The business record remains in the database
   * but is excluded from normal business listings and operations.
   */
  static async deleteBusiness(id, userId) {
    try {
      if (!id) {
        throw new Error("Business ID is required");
      }

      const { data: business, error } = await supabase
        .from("businesses")
        .select("owner_id, is_active")
        .eq("id", id)
        .single();

      if (error || !business) {
        throw new Error("Business does not exist");
      }

      if (!business.is_active) {
        throw new Error("Business is already deactivated");
      }

      if (business.owner_id !== userId) {
        throw new Error("You are not authorized to delete this business");
      }

      await supabase
        .from("products")
        .update({ is_available: false })
        .eq("business_id", id);

      await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("business_id", id);

      await supabase
        .from("businesses")
        .update({ is_active: false })
        .eq("id", id);

      return "Business and all associated data deactivated successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default BusinessService;