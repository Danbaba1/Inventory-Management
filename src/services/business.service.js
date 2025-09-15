import Business from "../models/business.model.js";

/**
 * BUSINESS SERVICE
 * Core business logic for business entity management
 * Handles registration, CRUD operations, validation, and ownership verification
 */
class BusinessService {
  /**
   * Register a new business entity
   * 
   * @description Complex business registration workflow with validation, 
   * uniqueness checks, and relationship establishment
   * 
   * Algorithm:
   * 1. Validate required fields and user authentication
   * 2. Check business name uniqueness (prevents conflicts)
   * 3. Create business entity with normalized data
   * 4. Establish owner relationship and populate references
   * 
   * @param {Object} businessData - Business registration data
   * @param {string} businessData.name - Business name (required, trimmed)
   * @param {string} businessData.type - Business type/category (required, trimmed)
   * @param {Array} businessData.categories - Associated category IDs (default: [])
   * @param {string} businessData.description - Business description (default: "", trimmed)
   * @param {Object} businessData.address - Business address object (default: {})
   * @param {Object} businessData.contactInfo - Contact information (default: {})
   * @param {string} userId - Owner's user ID (required for ownership establishment)
   * 
   * @returns {Object} Registration result with success message and populated business
   * @throws {Error} Validation errors, uniqueness conflicts, database errors
   */
  static async registerBusiness(businessData, userId) {
    try {
      // Destructure with defaults for optional fields
      const {
        name,
        type,
        categories = [],
        description = "",
        address = {},
        contactInfo = {},
      } = businessData;

      // Critical validation: ensure required fields
      if (!name || !type) {
        throw new Error("Please provide both name and type");
      }

      // Authentication check: prevent orphaned businesses
      if (!userId) {
        throw new Error("User ID is required to register a business");
      }

      // Uniqueness constraint: prevent duplicate business names
      // Note: This creates a potential race condition in high-concurrency scenarios
      const existingBusiness = await Business.findOne({ name });
      if (existingBusiness) {
        throw new Error("Business with this name already exists");
      }

      // Create business entity with normalized data
      const newBusiness = new Business({
        name: name.trim(), // Normalize whitespace
        type: type.trim(),
        categories, // Array of category ObjectIds
        description: description.trim(),
        address, // Embedded document
        contactInfo, // Embedded document
        owner: userId, // Establish ownership relationship
        isActive: true, // Default active state
      });

      // Persist to database
      await newBusiness.save();

      // Populate relationships for response
      // This provides complete object graph for client consumption
      await newBusiness.populate([
        { path: "owner", select: "name email" }, // Owner basic info
        { path: "categories", select: "name description" }, // Category details
      ]);

      return {
        message: "Business registered successfully",
        business: newBusiness,
      };
    } catch (err) {
      // Re-throw with preserved error message for proper error handling
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve businesses with pagination and filtering
   * 
   * @description Advanced query system with pagination, search, and filtering capabilities
   * 
   * Algorithm:
   * 1. Build dynamic query based on filters
   * 2. Implement text search across name and description
   * 3. Apply pagination with skip/limit
   * 4. Populate nested relationships including conditional product filtering
   * 5. Calculate pagination metadata
   * 
   * @param {number} page - Page number (1-based, default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {Object} filters - Search and filter options
   * @param {string} filters.type - Filter by business type
   * @param {string} filters.owner - Filter by owner ID
   * @param {string} filters.search - Text search in name/description (case-insensitive regex)
   * 
   * @returns {Object} Paginated results with businesses and pagination metadata
   * @throws {Error} Database query errors
   */
  static async getBusinesses(page = 1, limit = 10, filters = {}) {
    try {
      // Calculate offset for pagination
      const skip = (page - 1) * limit;

      // Base query: only active businesses
      const query = { isActive: true };

      // Dynamic filter building
      if (filters.type) query.type = filters.type;
      if (filters.owner) query.owner = filters.owner;
      
      // Text search implementation using regex
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } }, // Case-insensitive name search
          { description: { $regex: filters.search, $options: "i" } }, // Case-insensitive description search
        ];
      }

      // Complex query with nested population
      const businesses = await Business.find(query)
        .populate({
          path: "categories",
          select: "name description",
          populate: {
            path: "products",
            select: "name price quantity description isAvailable",
            match: { isAvailable: true }, // Only available products
          },
        })
        .populate("owner", "name email") // Owner basic information
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1, // Most recent first
        });

      // Count total for pagination calculation
      const total = await Business.countDocuments(query);

      // Pagination metadata calculation
      const totalPages = Math.ceil(total / limit);

      return {
        businesses,
        pagination: {
          currentPage: page,
          totalPage: totalPages,
          totalBusinesses: total,
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
   * 
   * @description Secure update operation with ownership validation and conflict prevention
   * 
   * Algorithm:
   * 1. Validate business ID and user authentication
   * 2. Verify business existence and ownership
   * 3. Check name uniqueness if changing name
   * 4. Apply partial updates with data merging for nested objects
   * 5. Return updated business with populated relationships
   * 
   * @param {string} id - Business ObjectId
   * @param {Object} updateData - Partial update data
   * @param {string} userId - User ID for ownership verification
   * 
   * @returns {Object} Update result with success message and updated business
   * @throws {Error} Authorization errors, validation errors, conflicts
   */
  static async updateBusiness(id, updateData, userId) {
    try {
      // Input validation
      if (!id) {
        throw new Error("Please provide your business ID");
      }

      // Fetch business for ownership verification
      const business = await Business.findById(id);
      if (!business) {
        throw new Error("Business does not exist");
      }

      // Critical security check: prevent unauthorized updates
      if (business.owner.toString() !== userId.toString()) {
        throw new Error("You are not authorized to update this business");
      }

      const { name, type, categories, description, address, contactInfo } = updateData;

      // Name uniqueness check (only if changing name)
      if (name && name !== business.name) {
        const existingBusiness = await Business.findOne({
          name: name.trim(),
          _id: { $ne: id }, // Exclude current business
        });
        if (existingBusiness) {
          throw new Error("Business with this name already exists");
        }
      }

      // Partial update implementation
      // Only update provided fields, preserving existing data
      if (name) business.name = name;
      if (type) business.type = type;
      if (categories !== undefined) business.categories = categories;
      if (description !== undefined) business.description = description.trim();
      
      // Nested object merging for address and contact info
      if (address !== undefined) {
        business.address = { ...business.address.toObject(), ...address };
      }
      if (contactInfo !== undefined) {
        business.contactInfo = {
          ...business.contactInfo.toObject(),
          ...contactInfo,
        };
      }

      // Persist changes
      const updatedBusiness = await business.save();
      
      // Populate for response
      await updatedBusiness.populate([
        { path: "owner", select: "name email" },
        { path: "categories", select: "name description" },
      ]);

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
   * 
   * @description Implements soft deletion pattern for data preservation
   * 
   * Algorithm:
   * 1. Validate business ID and user authentication
   * 2. Verify business existence and ownership
   * 3. Set isActive flag to false (soft delete)
   * 4. Preserve business data for audit/recovery purposes
   * 
   * Note: Uses soft delete instead of hard delete to maintain referential integrity
   * and enable potential data recovery
   * 
   * @param {string} id - Business ObjectId
   * @param {string} userId - User ID for ownership verification
   * 
   * @returns {string} Success message
   * @throws {Error} Authorization errors, validation errors
   */
  static async deleteBusiness(id, userId) {
    try {
      if (!id) {
        throw new Error("Business ID is required");
      }

      const business = await Business.findById(id);
      if (!business) {
        throw new Error("Business does not exist");
      }

      // Security: ownership verification
      if (business.owner.toString() !== userId.toString()) {
        throw new Error("You are not authorized to delete this business");
      }

      // Soft delete implementation
      business.isActive = false;
      await business.save();

      return "Business deactivated successfully";

      // Hard delete alternative (commented out for safety)
      // await Business.findByIdAndDelete(id);
      // return "Business deleted permanently";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default BusinessService;