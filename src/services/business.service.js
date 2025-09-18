import { supabase } from "../config/supabase.js";

/**
 * BUSINESS SERVICE - Fixed for PostgreSQL/Supabase
 * Core business logic for business entity management
 */
class BusinessService {
  /**
   * Register a new business entity
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
        .select("id")
        .eq("name", name.trim())
        .single();

      if (existingBusiness) {
        throw new Error("Business with this name already exists");
      }

      // Create business
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
   * Retrieve businesses with pagination and filtering
   */
  static async getBusinesses(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from("businesses")
        .select(`
          *,
          owner:owner_id(name, email),
          categories(id, name, description),
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
   * Update existing business with ownership verification
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
   */
  static async deleteBusiness(id, userId) {
    try {
      if (!id) {
        throw new Error("Business ID is required");
      }

      const { data: business, error } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (error || !business) {
        throw new Error("Business does not exist");
      }

      if (business.owner_id !== userId) {
        throw new Error("You are not authorized to delete this business");
      }

      await supabase
        .from("businesses")
        .update({ is_active: false })
        .eq("id", id);

      return "Business deactivated successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default BusinessService;