import mongoose from "mongoose";

/**
 * Business Model Schema - Multi-Tenant Business Entity Definition
 * 
 * Defines the core business entity for the multi-tenant inventory management system.
 * Each business represents an independent tenant with its own categories, products,
 * and inventory. This schema establishes the foundation for business-level data
 * isolation and multi-business operations.
 * 
 * Schema Relationships:
 * - Business -> User (owner relationship, many-to-one)
 * - Business -> Category (one-to-many via categories array)
 * - Category -> Product (indirect relationship through categories)
 * - Product -> Inventory (indirect relationship through business hierarchy)
 * 
 * Multi-Tenancy Architecture:
 * User (1) -> Business (many) -> Categories (many) -> Products (many) -> Inventory (many)
 * 
 * Core Features:
 * - Unique business naming system-wide
 * - Owner-based access control
 * - Business status management (active/inactive)
 * - Rich business profile information
 * - Address and contact information storage
 * - Category association and management
 * 
 * Database Optimization:
 * - Strategic indexing for common queries
 * - Efficient relationship modeling
 * - Optimized for multi-tenant operations
 * 
 * @model Business
 * @collection businesses
 */

const BusinessSchema = new mongoose.Schema(
  {
    /**
     * Business Name
     * 
     * Unique identifier for the business across the entire system.
     * Used for business identification, branding, and user recognition.
     * 
     * Validation Rules:
     * - Must be unique system-wide (no duplicate business names)
     * - Required field (cannot be empty or null)
     * - Automatically trimmed to remove leading/trailing whitespace
     * - Case-sensitive uniqueness validation
     * 
     * Business Logic:
     * - Serves as primary business identifier for users
     * - Used in business selection and switching operations
     * - Displayed in business listings and management interfaces
     * - Cannot be changed to match existing business names
     * 
     * Database Considerations:
     * - Indexed for fast uniqueness checks and search operations
     * - String field optimized for text-based queries
     * - Supports partial text matching for business search
     * 
     * @field name
     * @type {String}
     * @required true
     * @unique true
     * @trim true
     * @example "Tech Solutions Inc"
     * @example "Downtown Coffee Shop"
     * @example "Global Manufacturing Corp"
     */
    name: { type: String, required: true, unique: true, trim: true },

    /**
     * Business Type/Category
     * 
     * Categorical classification of the business industry or sector.
     * Used for business organization, reporting, and industry-specific
     * features or templates.
     * 
     * Validation Rules:
     * - Required field for business classification
     * - Automatically trimmed for consistency
     * - Free-form text allowing custom business types
     * - Case-sensitive storage
     * 
     * Common Business Types:
     * - "Retail" - Retail stores and shops
     * - "Manufacturing" - Production and manufacturing
     * - "Technology Services" - IT and tech companies
     * - "Restaurant" - Food service establishments
     * - "Healthcare" - Medical and health services
     * - "Consulting" - Professional services
     * - "E-commerce" - Online retail operations
     * 
     * Usage Patterns:
     * - Business filtering and categorization
     * - Industry-specific feature enablement
     * - Reporting and analytics grouping
     * - Template and workflow customization
     * 
     * @field type
     * @type {String}
     * @required true
     * @trim true
     * @indexed true
     * @example "Technology Services"
     * @example "Retail"
     * @example "Manufacturing"
     */
    type: { type: String, required: true, trim: true },

    /**
     * Business Active Status
     * 
     * Boolean flag controlling business accessibility and operations.
     * Inactive businesses are excluded from regular operations while
     * preserving data for potential reactivation.
     * 
     * Status Behavior:
     * - true: Business is active and fully operational
     * - false: Business is deactivated and inaccessible
     * 
     * Default Value:
     * - New businesses default to active status (true)
     * - Ensures immediate usability after registration
     * 
     * Operational Impact:
     * - Active businesses: Full access to all operations
     * - Inactive businesses: Blocked from user access
     * - Data preservation: All data retained during deactivation
     * - Reactivation: Can be restored to active status
     * 
     * Use Cases:
     * - Temporary business suspension
     * - Account management and billing issues
     * - Business closure with data retention
     * - Administrative control over business access
     * 
     * @field isActive
     * @type {Boolean}
     * @required true
     * @default true
     * @indexed true
     */
    isActive: { type: Boolean, required: true, default: true },

    /**
     * Business Categories Collection
     * 
     * Array of references to Category documents associated with this business.
     * Establishes the hierarchical relationship between businesses and their
     * product categorization system.
     * 
     * Relationship Details:
     * - One-to-many relationship (Business -> Categories)
     * - Each category belongs to exactly one business
     * - Categories enable product organization and management
     * - Required for business operations (at least one category expected)
     * 
     * Reference Behavior:
     * - ObjectId references to Category collection
     * - Populate support for category details
     * - Cascade operations for category management
     * - Referential integrity maintained
     * 
     * Category Hierarchy:
     * Business -> Categories -> Products -> Inventory
     * 
     * Usage Patterns:
     * - Product categorization and organization
     * - Category-based product filtering
     * - Business structure management
     * - Inventory organization by category
     * 
     * Data Management:
     * - Categories added/removed through business operations
     * - Category deletion affects product organization
     * - Business deletion cascades to categories
     * 
     * @field categories
     * @type {Array<ObjectId>}
     * @ref "Category"
     * @required true
     * @relationship one-to-many
     * @cascade delete
     * @example ["64a7b8c9d12345e6f7890123", "64a7b8c9d12345e6f7890124"]
     */
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],

    /**
     * Business Owner Reference
     * 
     * Reference to the User who owns and manages this business.
     * Establishes ownership for access control and business operations.
     * 
     * Ownership Model:
     * - Each business has exactly one owner
     * - Owners can have multiple businesses
     * - Owner has full control over business operations
     * - Ownership transfer supported through updates
     * 
     * Access Control:
     * - Only owners can modify business details
     * - Owners control business categories and products
     * - Admin users have oversight capabilities
     * - Ownership validation required for all operations
     * 
     * Relationship Details:
     * - Many-to-one relationship (Businesses -> User)
     * - Required field ensuring every business has an owner
     * - ObjectId reference to User collection
     * - Indexed for efficient owner-based queries
     * 
     * Business Operations:
     * - Business creation requires authenticated user
     * - Owner can update business information
     * - Owner can manage categories and products
     * - Owner can activate/deactivate business
     * 
     * @field owner
     * @type {ObjectId}
     * @ref "User"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @accessControl ownership-based
     * @example "64a7b8c9d12345e6f7890125"
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Business Description
     * 
     * Optional detailed description of the business, its services,
     * or operational focus. Provides additional context and branding
     * information for business identification.
     * 
     * Field Properties:
     * - Optional field (not required for business creation)
     * - Automatically trimmed for clean data storage
     * - Supports rich text descriptions
     * - No length restrictions (flexible content)
     * 
     * Usage Scenarios:
     * - Business profile information
     * - Marketing and branding content
     * - Internal business documentation
     * - Search and filtering enhancement
     * 
     * Content Examples:
     * - Service descriptions and specializations
     * - Company mission statements
     * - Business focus and target markets
     * - Operational highlights and features
     * 
     * @field description
     * @type {String}
     * @required false
     * @trim true
     * @example "Full-service IT consulting firm specializing in cloud solutions and digital transformation"
     * @example "Family-owned restaurant serving authentic Italian cuisine since 1985"
     */
    description: {
      type: String,
      trim: true,
    },

    /**
     * Business Address Information
     * 
     * Structured address object containing complete business location details.
     * Supports international addressing with flexible field requirements.
     * 
     * Address Structure:
     * - street: Street address and building number
     * - city: City or municipality name
     * - state: State, province, or region
     * - sipCode: Postal/ZIP code (typo: should be zipCode)
     * - country: Country name or code
     * 
     * Field Properties:
     * - All address fields are optional strings
     * - Flexible addressing for international businesses
     * - Nested object structure for organized storage
     * - No validation constraints (accommodates various formats)
     * 
     * Usage Applications:
     * - Business location display and mapping
     * - Shipping and logistics operations
     * - Local business search and filtering
     * - Contact and correspondence information
     * 
     * International Support:
     * - Flexible field usage for different address formats
     * - No country-specific validation restrictions
     * - Accommodates various postal code formats
     * - Cultural address format flexibility
     * 
     * @field address
     * @type {Object}
     * @required false
     * @structure nested
     * @properties street, city, state, sipCode, country
     * @example { street: "123 Main St", city: "San Francisco", state: "CA", sipCode: "94101", country: "USA" }
     */
    address: {
      street: String,
      city: String,
      state: String,
      sipCode: String,  // Note: Likely typo for zipCode
      country: String,
    },

    /**
     * Business Contact Information
     * 
     * Structured contact details for business communication and customer reach.
     * Provides multiple communication channels for business operations.
     * 
     * Contact Structure:
     * - email: Primary business email address
     * - phone: Business phone number
     * - website: Business website URL
     * 
     * Field Properties:
     * - All contact fields are optional strings
     * - No format validation (flexible input)
     * - Nested object for organized storage
     * - Supports international formats
     * 
     * Communication Channels:
     * - Email: Primary digital communication
     * - Phone: Voice communication and support
     * - Website: Online presence and marketing
     * 
     * Usage Applications:
     * - Customer communication and support
     * - Business marketing and promotion
     * - Professional networking and partnerships
     * - Service delivery and coordination
     * 
     * Validation Considerations:
     * - Email format validation recommended at application level
     * - Phone number format flexibility for international numbers
     * - Website URL validation for proper formatting
     * 
     * @field contactInfo
     * @type {Object}
     * @required false
     * @structure nested
     * @properties email, phone, website
     * @example { email: "contact@business.com", phone: "+1-555-0123", website: "https://business.com" }
     */
    contactInfo: {
      email: String,
      phone: String,
      website: String,
    },
  },
  {
    /**
     * Schema Configuration Options
     * 
     * Additional schema settings for timestamps and database optimization.
     * 
     * Timestamps Configuration:
     * - timestamps: true enables automatic createdAt and updatedAt fields
     * - createdAt: Set when document is first created
     * - updatedAt: Updated automatically on document modifications
     * 
     * Database Indexes:
     * Strategic indexes for optimized query performance:
     * - name: Fast business name lookups and uniqueness checks
     * - owner: Efficient owner-based business queries
     * - isActive: Quick filtering of active/inactive businesses
     * - type: Business type categorization and filtering
     * 
     * Index Benefits:
     * - Improved query performance for common operations
     * - Faster business ownership verification
     * - Efficient business listing and filtering
     * - Optimized search operations
     * 
     * @config timestamps
     * @value true
     * @fields createdAt, updatedAt
     * 
     * @config indexes
     * @fields name, owner, isActive, type
     * @purpose query optimization
     */
    timestamps: true,
    indexes: [{ name: 1 }, { owner: 1 }, { isActive: 1 }, { type: 1 }],
  }
);

/**
 * Business Model Instance
 * 
 * Compiled Mongoose model for Business schema operations.
 * Provides full CRUD operations and business-specific methods.
 * 
 * Available Operations:
 * - Business.create(): Create new business
 * - Business.findById(): Find business by ID
 * - Business.findOne(): Find single business with conditions
 * - Business.find(): Find multiple businesses with filtering
 * - Business.updateOne(): Update single business
 * - Business.deleteOne(): Delete single business
 * 
 * Population Support:
 * - Populate owner for user details
 * - Populate categories for category information
 * - Deep population for complete business data
 * 
 * @model Business
 * @collection businesses
 * @schema BusinessSchema
 */
const Business = mongoose.model("Business", BusinessSchema);
export default Business;