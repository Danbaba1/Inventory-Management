import mongoose from "mongoose";

/**
 * Category Model Schema - Product Organization and Classification System
 * 
 * Defines the product category entity for organizing and managing products within
 * each business in the multi-tenant inventory management system. Categories provide
 * hierarchical structure for product organization, enabling efficient product
 * management, filtering, and inventory operations.
 * 
 * Schema Relationships:
 * - Category -> Business (many-to-one, each category belongs to one business)
 * - Category -> Product (one-to-many via products array)
 * - Business -> Category (one-to-many, business can have multiple categories)
 * 
 * Multi-Tenancy Architecture:
 * Business (1) -> Categories (many) -> Products (many) -> Inventory (many)
 * 
 * Core Features:
 * - Business-scoped category naming (unique within business)
 * - Product organization and classification
 * - Category status management (active/inactive)
 * - Hierarchical product structure support
 * - Business-level category isolation
 * 
 * Database Optimization:
 * - Composite indexing for business-scoped operations
 * - Efficient category-product relationship queries
 * - Optimized for multi-tenant category operations
 * 
 * @model Category
 * @collection categories
 */

const CategorySchema = new mongoose.Schema(
  {
    /**
     * Category Name
     * 
     * Human-readable name for the product category within a specific business.
     * Must be unique within the business scope but can be duplicated across
     * different businesses for multi-tenant isolation.
     * 
     * Validation Rules:
     * - Required field (cannot be empty or null)
     * - Automatically trimmed to remove leading/trailing whitespace
     * - Maximum length of 100 characters for display optimization
     * - Unique constraint combined with business ID (composite uniqueness)
     * 
     * Business Logic:
     * - Serves as primary category identifier within business
     * - Used for product organization and classification
     * - Displayed in category listings and product management
     * - Case-sensitive naming within business scope
     * 
     * Uniqueness Scope:
     * - Unique within each business (business-scoped uniqueness)
     * - Multiple businesses can have same category names
     * - Enforced through composite index (name + business)
     * 
     * Usage Patterns:
     * - Product categorization and organization
     * - Inventory filtering and reporting
     * - Business catalog structure management
     * - E-commerce category navigation
     * 
     * @field name
     * @type {String}
     * @required true
     * @trim true
     * @maxLength 100
     * @unique composite (with business)
     * @example "Electronics"
     * @example "Clothing & Apparel"
     * @example "Home & Garden"
     * @example "Books & Media"
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },

    /**
     * Business Reference
     * 
     * Reference to the Business that owns this category. Establishes the
     * multi-tenant relationship and ensures category isolation between
     * different businesses in the system.
     * 
     * Relationship Details:
     * - Many-to-one relationship (Categories -> Business)
     * - Each category belongs to exactly one business
     * - Required field ensuring category-business association
     * - ObjectId reference to Business collection
     * 
     * Multi-Tenancy Implementation:
     * - Provides business-level data isolation
     * - Enables category scoping within business context
     * - Supports business-specific category operations
     * - Facilitates business ownership validation
     * 
     * Access Control:
     * - Category operations require business ownership validation
     * - Only business owners can manage their categories
     * - Categories inherit business access permissions
     * - Cross-business category access prevented
     * 
     * Operational Impact:
     * - All category queries scoped to business
     * - Category uniqueness enforced within business
     * - Category deletion affects only owning business
     * - Business deletion cascades to categories
     * 
     * Database Optimization:
     * - Indexed for efficient business-category queries
     * - Combined with other fields for composite indexes
     * - Supports fast business-scoped operations
     * 
     * @field business
     * @type {ObjectId}
     * @ref "Business"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @multiTenant business-scoped
     * @accessControl ownership-based
     * @example "64a7b8c9d12345e6f7890125"
     */
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    /**
     * Products Collection
     * 
     * Array of references to Product documents that belong to this category.
     * Establishes the hierarchical relationship between categories and products
     * for organized inventory management.
     * 
     * Relationship Details:
     * - One-to-many relationship (Category -> Products)
     * - Each product can belong to one category
     * - Optional field (categories can exist without products)
     * - ObjectId references to Product collection
     * 
     * Product Organization:
     * - Products organized within category structure
     * - Category-based product filtering and search
     * - Hierarchical inventory management
     * - Product classification and grouping
     * 
     * Collection Management:
     * - Products added/removed through product operations
     * - Category deletion affects associated products
     * - Product creation requires category assignment
     * - Supports bulk product operations by category
     * 
     * Usage Patterns:
     * - Category-based product listings
     * - Inventory reporting by category
     * - Product search and filtering
     * - Category performance analytics
     * 
     * Data Integrity:
     * - Referential integrity maintained with Product collection
     * - Cascade operations for category-product management
     * - Orphaned product handling on category deletion
     * - Product reassignment support
     * 
     * Performance Considerations:
     * - Populate support for product details
     * - Efficient category-product aggregate queries
     * - Indexed relationships for fast lookups
     * - Optimized for category-based operations
     * 
     * @field products
     * @type {Array<ObjectId>}
     * @ref "Product"
     * @required false
     * @relationship one-to-many
     * @cascade affects
     * @population supported
     * @example ["64a7b8c9d12345e6f7890126", "64a7b8c9d12345e6f7890127"]
     */
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    /**
     * Category Active Status
     * 
     * Boolean flag controlling category visibility and operational status.
     * Inactive categories are excluded from regular operations while
     * preserving category data and associated products.
     * 
     * Status Behavior:
     * - true: Category is active and fully operational
     * - false: Category is deactivated and hidden from operations
     * 
     * Default Value:
     * - New categories default to active status (true)
     * - Ensures immediate availability after creation
     * - No manual activation required
     * 
     * Operational Impact:
     * - Active categories: Visible in category listings
     * - Active categories: Available for product assignment
     * - Inactive categories: Hidden from user interfaces
     * - Inactive categories: Products remain accessible
     * 
     * Product Relationship:
     * - Category deactivation doesn't affect existing products
     * - Products in inactive categories remain operational
     * - New products cannot be added to inactive categories
     * - Product search may exclude inactive category products
     * 
     * Use Cases:
     * - Seasonal category management
     * - Category restructuring and cleanup
     * - Temporary category suspension
     * - Category archival with data preservation
     * 
     * Business Logic:
     * - Category filtering based on active status
     * - Administrative category management
     * - Category lifecycle management
     * - Soft deletion alternative
     * 
     * @field isActive
     * @type {Boolean}
     * @required false
     * @default true
     * @indexed true
     * @softDelete alternative
     * @affects visibility, not data integrity
     */
    isActive: { type: Boolean, default: true },

    /**
     * Category Description
     * 
     * Optional detailed description providing additional context about the
     * category's purpose, scope, and intended product types. Supports
     * category documentation and user guidance.
     * 
     * Field Properties:
     * - Optional field (not required for category creation)
     * - Maximum length of 500 characters for concise descriptions
     * - No automatic trimming (preserves formatting)
     * - Supports rich descriptive content
     * 
     * Content Guidelines:
     * - Category purpose and scope definition
     * - Product type examples and guidelines
     * - Business-specific category usage notes
     * - Category management instructions
     * 
     * Usage Applications:
     * - Category management documentation
     * - User guidance for product categorization
     * - Business catalog organization notes
     * - Category search and discovery enhancement
     * 
     * Length Considerations:
     * - 500 character limit for database efficiency
     * - Adequate length for meaningful descriptions
     * - Prevents excessive content storage
     * - Optimized for display interfaces
     * 
     * Business Value:
     * - Improved category understanding
     * - Consistent product categorization
     * - Enhanced user experience
     * - Better inventory organization
     * 
     * @field description
     * @type {String}
     * @required false
     * @maxlength 500
     * @purpose documentation
     * @example "Electronic devices including computers, phones, and accessories"
     * @example "Clothing items for men, women, and children of all ages"
     * @example "Books, magazines, digital media, and educational materials"
     */
    description: { type: String, maxlength: 500 },
  },
  {
    /**
     * Schema Configuration Options
     * 
     * Additional schema settings for automatic timestamp management
     * and optimized database operations.
     * 
     * Timestamps Configuration:
     * - timestamps: true enables automatic createdAt and updatedAt fields
     * - createdAt: Set when category is first created
     * - updatedAt: Updated automatically on category modifications
     * - Useful for category lifecycle tracking and auditing
     * 
     * Timestamp Benefits:
     * - Category creation tracking
     * - Modification history for auditing
     * - Category age and usage analysis
     * - Automated timestamp management
     * 
     * @config timestamps
     * @value true
     * @fields createdAt, updatedAt
     * @purpose lifecycle tracking
     */
    timestamps: true,
  }
);

/**
 * Database Indexes - Performance Optimization
 * 
 * Strategic indexes designed for optimal query performance in
 * multi-tenant category operations and business-scoped queries.
 */

/**
 * Composite Unique Index - Business-Scoped Category Names
 * 
 * Ensures category name uniqueness within each business while allowing
 * duplicate names across different businesses for proper multi-tenancy.
 * 
 * Index Structure:
 * - name (ascending): Category name field
 * - business (ascending): Business reference field
 * - unique: true enforces uniqueness constraint
 * 
 * Uniqueness Enforcement:
 * - Prevents duplicate category names within same business
 * - Allows same category names in different businesses
 * - Database-level constraint enforcement
 * - Error thrown on duplicate attempts
 * 
 * Performance Benefits:
 * - Fast category name validation queries
 * - Efficient duplicate detection
 * - Optimized category creation operations
 * - Quick business-category lookups
 * 
 * Query Optimization:
 * - Category.find({ name: "Electronics", business: businessId })
 * - Unique constraint validation
 * - Business-scoped category searches
 * 
 * @index composite-unique
 * @fields name (1), business (1)
 * @unique true
 * @purpose business-scoped uniqueness
 */
CategorySchema.index({ name: 1, business: 1 }, { unique: true });

/**
 * Composite Performance Index - Business Operations
 * 
 * Optimizes queries that filter categories by business and active status,
 * supporting common category listing and management operations.
 * 
 * Index Structure:
 * - business (ascending): Business reference field
 * - isActive (ascending): Category status field
 * 
 * Query Optimization:
 * - Category.find({ business: businessId, isActive: true })
 * - Active category listings for business
 * - Category management interfaces
 * - Product assignment category selection
 * 
 * Performance Benefits:
 * - Fast active category retrieval
 * - Efficient business category filtering
 * - Optimized category status queries
 * - Reduced query execution time
 * 
 * Use Cases:
 * - Business category dashboard loading
 * - Active category dropdown population
 * - Category-based product operations
 * - Business analytics and reporting
 * 
 * @index composite-performance
 * @fields business (1), isActive (1)
 * @purpose query optimization
 */
CategorySchema.index({ business: 1, isActive: 1 });

/**
 * Category Model Instance
 * 
 * Compiled Mongoose model for Category schema operations.
 * Provides full CRUD operations and category-specific methods
 * with multi-tenant support and business-scoped operations.
 * 
 * Available Operations:
 * - Category.create(): Create new category with business association
 * - Category.findById(): Find category by ID with populate support
 * - Category.find(): Find categories with business scoping
 * - Category.updateOne(): Update single category
 * - Category.deleteOne(): Delete category and handle product relationships
 * 
 * Population Support:
 * - Populate business for business details
 * - Populate products for product information
 * - Deep population for complete category data
 * 
 * Business-Scoped Operations:
 * - All queries should include business filter
 * - Category uniqueness validated within business scope
 * - Access control through business ownership
 * 
 * @model Category
 * @collection categories
 * @schema CategorySchema
 * @multiTenant business-scoped
 */
const Category = mongoose.model("Category", CategorySchema);
export default Category;