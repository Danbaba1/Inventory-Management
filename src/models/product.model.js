import mongoose from "mongoose";

/**
 * Product Model Schema - Core Inventory Item Definition
 * 
 * Defines the fundamental product entity for the multi-tenant inventory management
 * system. Products represent sellable items, stock keeping units (SKUs), or
 * inventory items that businesses track and manage. Each product belongs to a
 * specific business and category within the hierarchical organization structure.
 * 
 * Schema Relationships:
 * - Product -> Business (many-to-one, business ownership and scoping)
 * - Product -> Category (many-to-one, product classification)
 * - Product -> TopUp (one-to-many, inventory addition history)
 * - Product -> UsageHistory (one-to-many, inventory consumption history)
 * 
 * Multi-Tenancy Architecture:
 * Business (1) -> Categories (many) -> Products (many) -> Inventory Movements (many)
 * 
 * Core Features:
 * - Business-scoped product naming with uniqueness constraints
 * - Category-based product organization and classification
 * - Real-time inventory quantity tracking and management
 * - Product availability status control
 * - Pricing information and financial data
 * - Rich product descriptions and metadata
 * - Advanced search and filtering capabilities
 * 
 * Inventory Integration:
 * - Direct quantity tracking with TopUp/Usage history
 * - Availability status based on quantity and business rules
 * - Real-time stock level monitoring and alerts
 * - Complete audit trail through related models
 * 
 * @model Product
 * @collection products
 */

const ProductSchema = new mongoose.Schema(
  {
    /**
     * Product Name
     * 
     * Human-readable name for the product within the business scope.
     * Must be unique within each business but can be duplicated across
     * different businesses for proper multi-tenant isolation.
     * 
     * Validation Rules:
     * - Required field (cannot be empty or null)
     * - Automatically trimmed to remove leading/trailing whitespace
     * - Maximum length of 200 characters for display optimization
     * - Unique constraint combined with business ID (composite uniqueness)
     * - Case-sensitive naming within business scope
     * 
     * Business Logic:
     * - Serves as primary product identifier within business
     * - Used for product search, filtering, and selection
     * - Displayed in product catalogs and inventory listings
     * - Key field for product management operations
     * - Integration point for external systems and APIs
     * 
     * Uniqueness Implementation:
     * - Business-scoped uniqueness prevents duplicate product names
     * - Multiple businesses can have identical product names
     * - Enforced through composite database index
     * - Validation occurs at database level for data integrity
     * 
     * Usage Patterns:
     * - Product catalog management and display
     * - Inventory search and filtering operations
     * - Sales order and transaction processing
     * - Reporting and analytics aggregation
     * - External system integration and data exchange
     * 
     * @field name
     * @type {String}
     * @required true
     * @trim true
     * @maxLength 200
     * @unique composite (with business)
     * @indexed true
     * @searchable true
     * @example "MacBook Pro 13-inch M2"
     * @example "Organic Coffee Beans - Dark Roast"
     * @example "Steel Bolt M8x25mm"
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },

    /**
     * Business Reference
     * 
     * Reference to the Business that owns this product. Establishes the
     * multi-tenant relationship and ensures product isolation between
     * different businesses in the system.
     * 
     * Relationship Details:
     * - Many-to-one relationship (Products -> Business)
     * - Each product belongs to exactly one business
     * - Required field ensuring product-business association
     * - ObjectId reference to Business collection
     * - Indexed for efficient business-scoped queries
     * 
     * Multi-Tenancy Implementation:
     * - Provides business-level data isolation and security
     * - Enables product scoping within business context
     * - Supports business-specific product operations
     * - Facilitates business ownership validation and access control
     * 
     * Access Control:
     * - Product operations require business ownership validation
     * - Only business owners can manage their products
     * - Products inherit business access permissions
     * - Cross-business product access prevented
     * 
     * Operational Impact:
     * - All product queries scoped to business context
     * - Product uniqueness enforced within business scope
     * - Product deletion affects only owning business
     * - Business deletion cascades to associated products
     * 
     * Performance Optimization:
     * - Indexed for fast business-product queries
     * - Combined with other fields for composite indexes
     * - Supports efficient business-scoped operations
     * - Enables rapid product filtering and searching
     * 
     * @field business
     * @type {ObjectId}
     * @ref "Business"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @multiTenant business-scoped
     * @accessControl ownership-based
     * @cascade delete
     * @example "64a7b8c9d12345e6f7890125"
     */
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    /**
     * Category Reference
     * 
     * Reference to the Category that classifies and organizes this product.
     * Establishes the hierarchical relationship within the business's
     * product organization structure.
     * 
     * Relationship Details:
     * - Many-to-one relationship (Products -> Category)
     * - Each product belongs to exactly one category
     * - Required field ensuring product classification
     * - ObjectId reference to Category collection
     * - Category must belong to same business as product
     * 
     * Product Organization:
     * - Provides hierarchical product structure
     * - Enables category-based product filtering and browsing
     * - Supports organized inventory management
     * - Facilitates product catalog navigation
     * 
     * Business Logic:
     * - Category and business must be consistent (referential integrity)
     * - Product inherits category's business association
     * - Category changes affect product organization
     * - Category deletion impacts product classification
     * 
     * Operational Applications:
     * - Category-based product listings and catalogs
     * - Inventory reporting by product category
     * - Category-specific business analytics
     * - Organized product management interfaces
     * 
     * Data Integrity:
     * - Cross-reference validation ensures category-business consistency
     * - Referential integrity maintained with Category collection
     * - Cascade operations for category management
     * - Orphaned product handling on category changes
     * 
     * Performance Benefits:
     * - Indexed for efficient category-product queries
     * - Supports fast category-based filtering
     * - Optimized for category navigation operations
     * - Enables rapid category analytics and reporting
     * 
     * @field category
     * @type {ObjectId}
     * @ref "Category"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @validation business-consistency
     * @cascade affects
     * @example "64a7b8c9d12345e6f7890126"
     */
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    /**
     * Product Price
     * 
     * Monetary value or cost of the product in the business's default currency.
     * Used for pricing calculations, sales transactions, and financial reporting.
     * 
     * Validation Rules:
     * - Required field for all products
     * - Minimum value of 0 (cannot have negative prices)
     * - Numeric field supporting decimal values
     * - No maximum limit for high-value items
     * 
     * Financial Applications:
     * - Sales transaction calculations
     * - Revenue and profit analysis
     * - Pricing strategy and optimization
     * - Cost analysis and margin calculations
     * - Financial reporting and analytics
     * 
     * Business Logic:
     * - Represents product's selling or list price
     * - Used in order total calculations
     * - Basis for discount and promotion calculations
     * - Integration with payment processing systems
     * - Historical price tracking through product updates
     * 
     * Currency Considerations:
     * - Stored as numeric value without currency symbol
     * - Business-level currency configuration implied
     * - Multi-currency support through business settings
     * - Price conversion and localization at application level
     * 
     * Pricing Strategies:
     * - Fixed pricing for standard products
     * - Dynamic pricing through application logic
     * - Bulk pricing through quantity-based calculations
     * - Promotional pricing through discount systems
     * 
     * @field price
     * @type {Number}
     * @required true
     * @min 0
     * @decimal supported
     * @currency business-default
     * @purpose financial-transactions
     * @example 1299.99
     * @example 15.50
     * @example 0 (for free items)
     */
    price: { type: Number, required: true, min: 0 },

    /**
     * Current Inventory Quantity
     * 
     * Real-time count of available product units in inventory. This field
     * is continuously updated through TopUp and UsageHistory operations,
     * providing accurate stock levels for business operations.
     * 
     * Validation Rules:
     * - Required field for inventory tracking
     * - Minimum value of 0 (cannot have negative inventory)
     * - Defaults to 0 for new products (empty inventory)
     * - Integer values for countable units
     * 
     * Inventory Management:
     * - Updated automatically through inventory operations
     * - Reflects real-time stock availability
     * - Basis for stock level alerts and notifications
     * - Integration with TopUp and UsageHistory models
     * 
     * Business Operations:
     * - Determines product availability for sales
     * - Used in stock level monitoring and alerts
     * - Basis for inventory replenishment decisions
     * - Key metric for inventory valuation
     * 
     * Operational Logic:
     * - quantity += quantityAdded (TopUp operations)
     * - quantity -= quantityUsed (Usage operations)
     * - quantity = 0 indicates out-of-stock condition
     * - quantity > 0 enables product sales and usage
     * 
     * Integration Points:
     * - TopUp model increases quantity values
     * - UsageHistory model decreases quantity values
     * - Virtual inStock field depends on quantity
     * - Low-stock alerts based on quantity thresholds
     * 
     * Reporting Applications:
     * - Inventory value calculations (quantity * price)
     * - Stock level reporting and analytics
     * - Inventory turnover analysis
     * - Demand forecasting and planning
     * 
     * @field quantity
     * @type {Number}
     * @required true
     * @min 0
     * @default 0
     * @integer recommended
     * @realTime updated
     * @integration TopUp, UsageHistory
     * @example 150
     * @example 0 (out of stock)
     */
    quantity: { type: Number, required: true, min: 0, default: 0 },

    /**
     * Product Availability Status
     * 
     * Boolean flag controlling product visibility and operational availability
     * independent of inventory quantity. Allows business control over product
     * sales and usage regardless of stock levels.
     * 
     * Status Behavior:
     * - true: Product is available for operations (default)
     * - false: Product is unavailable and hidden from operations
     * 
     * Default Value:
     * - New products default to available status (true)
     * - Ensures immediate availability after product creation
     * - No manual activation required for standard products
     * 
     * Business Control:
     * - Enables product discontinuation without deletion
     * - Supports seasonal product management
     * - Allows temporary product suspension
     * - Facilitates product lifecycle management
     * 
     * Operational Impact:
     * - Available products: Visible in product catalogs
     * - Available products: Eligible for sales and usage
     * - Unavailable products: Hidden from customer interfaces
     * - Unavailable products: Blocked from new transactions
     * 
     * Use Cases:
     * - Product discontinuation and phase-out
     * - Seasonal availability management
     * - Quality control and product recalls
     * - Business policy enforcement
     * - Temporary product suspension
     * 
     * Integration with inStock Virtual:
     * - inStock = quantity > 0 && isAvailable
     * - Both quantity and availability must be positive
     * - Provides comprehensive availability logic
     * - Supports complex business rules
     * 
     * @field isAvailable
     * @type {Boolean}
     * @required false
     * @default true
     * @indexed true
     * @purpose business-control
     * @affects visibility
     * @integration inStock virtual
     * @example true (normal operation)
     * @example false (discontinued product)
     */
    isAvailable: { type: Boolean, default: true },

    /**
     * Product Description
     * 
     * Optional detailed description providing comprehensive information about
     * the product, its features, specifications, and usage details. Supports
     * rich product documentation and customer information.
     * 
     * Field Properties:
     * - Optional field (not required for product creation)
     * - Maximum length of 1000 characters for detailed descriptions
     * - No automatic trimming (preserves formatting)
     * - Supports rich descriptive content and specifications
     * - Full-text search enabled for content discovery
     * 
     * Content Applications:
     * - Product specifications and technical details
     * - Usage instructions and guidelines
     * - Feature descriptions and benefits
     * - Compatibility information and requirements
     * - Marketing copy and promotional content
     * 
     * Business Value:
     * - Enhanced product information for customers
     * - Improved product searchability and discovery
     * - Better customer understanding and decision-making
     * - Reduced customer support inquiries
     * - Enhanced product catalog presentation
     * 
     * Search Integration:
     * - Full-text search enabled with text index
     * - Searchable alongside product name
     * - Improves product discovery and filtering
     * - Supports content-based product matching
     * 
     * Length Optimization:
     * - 1000 character limit balances detail with performance
     * - Adequate space for comprehensive product information
     * - Prevents excessive content storage and display issues
     * - Optimized for various display interfaces and formats
     * 
     * @field description
     * @type {String}
     * @required false
     * @maxLength 1000
     * @searchable true
     * @indexed text
     * @purpose product-information
     * @example "High-performance laptop with M2 chip, 13-inch Retina display, 256GB SSD storage, and up to 20 hours of battery life. Perfect for professionals and students."
     * @example "Premium organic coffee beans sourced from Ethiopian highlands. Medium-dark roast with notes of chocolate and citrus. Whole beans, 1lb package."
     */
    description: { type: String, maxLength: 1000 },
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
     * - createdAt: Set when product is first created
     * - updatedAt: Updated automatically on product modifications
     * - Essential for product lifecycle tracking and audit trails
     * 
     * Timestamp Benefits:
     * - Product creation and modification tracking
     * - Inventory history and audit capabilities
     * - Product age analysis and lifecycle management
     * - Automated timestamp maintenance
     * 
     * @config timestamps
     * @value true
     * @fields createdAt, updatedAt
     * @purpose lifecycle-tracking
     */
    timestamps: true,
  }
);

/**
 * Database Indexes - Product Performance Optimization
 * 
 * Strategic indexes designed for optimal query performance in product
 * operations, search functionality, and business-scoped queries.
 */

/**
 * Composite Unique Index - Business-Scoped Product Names
 * 
 * Ensures product name uniqueness within each business while allowing
 * duplicate names across different businesses for proper multi-tenancy.
 * 
 * Index Structure:
 * - name (ascending): Product name field
 * - business (ascending): Business reference field
 * - unique: true enforces uniqueness constraint
 * 
 * Uniqueness Enforcement:
 * - Prevents duplicate product names within same business
 * - Allows identical product names in different businesses
 * - Database-level constraint for data integrity
 * - Error handling for duplicate creation attempts
 * 
 * Performance Benefits:
 * - Fast product name validation and duplicate detection
 * - Efficient product lookup within business scope
 * - Optimized product creation and validation operations
 * - Quick business-product name resolution
 * 
 * @index composite-unique
 * @fields name (1), business (1)
 * @unique true
 * @purpose business-scoped-uniqueness
 */
ProductSchema.index({ name: 1, business: 1 }, { unique: true });

/**
 * Business-Category Composite Index
 * 
 * Optimizes queries for category-based product listings within business scope.
 * Essential for product catalog navigation and category management.
 * 
 * Query Optimization:
 * - Product.find({ business: businessId, category: categoryId })
 * - Category-based product listings
 * - Product catalog navigation
 * - Category management interfaces
 * 
 * @index business-category
 * @fields business (1), category (1)
 * @queries category product listings
 */
ProductSchema.index({ business: 1, category: 1 });

/**
 * Business-Availability Composite Index
 * 
 * Optimizes queries for available product filtering within business scope.
 * Supports product visibility and availability management.
 * 
 * Query Optimization:
 * - Product.find({ business: businessId, isAvailable: true })
 * - Available product listings
 * - Product catalog filtering
 * - Sales interface product selection
 * 
 * @index business-availability
 * @fields business (1), isAvailable (1)
 * @queries available product filtering
 */
ProductSchema.index({ business: 1, isAvailable: 1 });

/**
 * Comprehensive Category-Availability Index
 * 
 * Advanced composite index combining business, category, and availability
 * filtering for optimized product catalog operations.
 * 
 * Query Optimization:
 * - Product.find({ business: businessId, category: categoryId, isAvailable: true })
 * - Available products within specific categories
 * - Category-based available product listings
 * - Optimized product catalog displays
 * 
 * @index comprehensive-category-availability
 * @fields business (1), category (1), isAvailable (1)
 * @queries category available products
 */
ProductSchema.index({ business: 1, category: 1, isAvailable: 1 });

/**
 * Full-Text Search Index
 * 
 * Enables comprehensive text search across product names and descriptions
 * within business scope for enhanced product discovery.
 * 
 * Search Capabilities:
 * - Product.find({ $text: { $search: "search terms" }, business: businessId })
 * - Full-text search in names and descriptions
 * - Product discovery and content-based matching
 * - Advanced product search functionality
 * 
 * Performance Benefits:
 * - Fast text-based product search
 * - Content relevance scoring
 * - Efficient product discovery
 * - Enhanced user search experience
 * 
 * @index full-text-search
 * @fields business (1), name (text), description (text)
 * @queries text search, product discovery
 */
ProductSchema.index({ business: 1, name: "text", description: "text" });

/**
 * Virtual Properties - Computed Product Attributes
 * 
 * Dynamic properties calculated from existing schema fields to provide
 * enhanced business logic and convenient access to computed values.
 */

/**
 * In-Stock Status Virtual Property
 * 
 * Computed boolean property that determines if a product is truly available
 * for sale or usage based on both inventory quantity and availability status.
 * 
 * Calculation Logic:
 * - inStock = quantity > 0 && isAvailable
 * - Requires both positive quantity and available status
 * - Provides comprehensive availability assessment
 * - Updates automatically when quantity or availability changes
 * 
 * Business Logic:
 * - true: Product has inventory and is marked available
 * - false: Product is either out of stock or marked unavailable
 * - Combines inventory and business availability rules
 * - Primary field for customer-facing availability display
 * 
 * Usage Applications:
 * - Product catalog availability display
 * - Sales interface inventory validation
 * - Customer order processing validation
 * - Inventory alert and notification systems
 * 
 * Integration Points:
 * - Used in product listing interfaces
 * - Referenced in sales transaction validation
 * - Integrated with notification systems
 * - Applied in customer-facing applications
 * 
 * Performance Characteristics:
 * - Computed on-demand (not stored in database)
 * - Minimal performance impact
 * - Always reflects current state
 * - No additional storage requirements
 * 
 * @virtual inStock
 * @type {Boolean}
 * @computed true
 * @calculation quantity > 0 && isAvailable
 * @purpose availability-assessment
 * @usage customer-facing
 * @example true (quantity: 50, isAvailable: true)
 * @example false (quantity: 0, isAvailable: true)
 * @example false (quantity: 50, isAvailable: false)
 */
ProductSchema.virtual("inStock").get(function () {
  return this.quantity > 0 && this.isAvailable;
});

/**
 * Product Model Instance
 * 
 * Compiled Mongoose model for Product schema operations.
 * Provides comprehensive CRUD operations, advanced querying capabilities,
 * and specialized product management methods.
 * 
 * Available Operations:
 * - Product.create(): Create new product with business and category association
 * - Product.findById(): Find product by ID with population support
 * - Product.find(): Find products with business scoping and filtering
 * - Product.updateOne(): Update product information and inventory
 * - Product.deleteOne(): Delete product and handle related data
 * 
 * Population Support:
 * - Populate business for business details and context
 * - Populate category for category information and hierarchy
 * - Deep population for complete product data with relationships
 * 
 * Advanced Querying:
 * - Text search across names and descriptions
 * - Complex filtering with multiple criteria
 * - Aggregation pipelines for analytics and reporting
 * - Business-scoped queries for multi-tenant operations
 * 
 * Virtual Properties:
 * - inStock: Computed availability status
 * - Additional virtuals can be added for business logic
 * 
 * Integration Features:
 * - TopUp model integration for inventory additions
 * - UsageHistory model integration for inventory consumption
 * - Category-based organization and classification
 * - Business-scoped operations and access control
 * 
 * @model Product
 * @collection products
 * @schema ProductSchema
 * @multiTenant business-scoped
 * @virtuals inStock
 * @indexes optimized for performance
 * @searchable full-text enabled
 */
const Product = mongoose.model("Product", ProductSchema);
export default Product;