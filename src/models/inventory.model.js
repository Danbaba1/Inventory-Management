import mongoose from "mongoose";

/**
 * Inventory Tracking Models - Top-Up and Usage History Management
 * 
 * These models provide comprehensive inventory tracking and audit capabilities
 * for the multi-tenant inventory management system. They maintain detailed
 * records of all inventory movements including stock additions (top-ups) and
 * stock consumption (usage), enabling complete inventory accountability.
 * 
 * Model Relationships:
 * - TopUp/UsageHistory -> Business (many-to-one, business-scoped operations)
 * - TopUp/UsageHistory -> Product (many-to-one, product-specific tracking)
 * - TopUp/UsageHistory -> User (many-to-one, user accountability)
 * 
 * Inventory Flow Architecture:
 * Business -> Products -> Inventory Movements (TopUp/Usage) -> Audit Trail
 * 
 * Core Features:
 * - Complete inventory movement audit trail
 * - User accountability for all inventory changes
 * - Business-scoped inventory tracking
 * - Before/after quantity state management
 * - Comprehensive reporting and analytics support
 * 
 * Audit Capabilities:
 * - Who: User performing the operation
 * - What: Product and quantities involved
 * - When: Timestamp of the operation
 * - Where: Business context
 * - How Much: Quantity changes and final states
 * 
 * @module InventoryTrackingModels
 * @models TopUp, UsageHistory
 */

/**
 * TopUp Schema - Inventory Stock Addition Tracking
 * 
 * Records all inventory replenishment operations including stock additions,
 * restocking, and inventory increases. Maintains complete audit trail for
 * inventory growth and supplier deliveries.
 * 
 * Business Process Flow:
 * 1. User initiates inventory top-up operation
 * 2. System records current quantity (oldQuantity)
 * 3. User specifies quantity to add (quantityAdded)
 * 4. System calculates new quantity (newQuantity)
 * 5. TopUp record created with complete transaction details
 * 6. Product inventory updated to new quantity
 * 
 * Audit Trail Features:
 * - Complete before/after quantity tracking
 * - User accountability for all additions
 * - Business context for multi-tenant operations
 * - Timestamp tracking for temporal analysis
 * - Quantity validation and business rules enforcement
 */
const TopUpSchema = new mongoose.Schema(
  {
    /**
     * Business Reference
     * 
     * Reference to the Business where the inventory top-up occurred.
     * Provides business context and enables business-scoped inventory
     * tracking and reporting within the multi-tenant system.
     * 
     * Relationship Details:
     * - Many-to-one relationship (TopUps -> Business)
     * - Required field ensuring business context
     * - ObjectId reference to Business collection
     * - Enables business-scoped inventory operations
     * 
     * Multi-Tenancy Implementation:
     * - Ensures top-up records are business-scoped
     * - Prevents cross-business inventory data access
     * - Supports business-specific inventory reporting
     * - Enables business owner access control
     * 
     * Operational Context:
     * - All top-up queries scoped to business
     * - Business deletion affects top-up history
     * - Business ownership controls access
     * - Supports business analytics and reporting
     * 
     * @field business
     * @type {ObjectId}
     * @ref "Business"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @multiTenant business-scoped
     * @example "64a7b8c9d12345e6f7890125"
     */
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    /**
     * Product Reference
     * 
     * Reference to the specific Product that received inventory addition.
     * Enables product-specific inventory tracking and detailed stock
     * movement analysis.
     * 
     * Relationship Details:
     * - Many-to-one relationship (TopUps -> Product)
     * - Required field ensuring product context
     * - ObjectId reference to Product collection
     * - Enables product-specific inventory analysis
     * 
     * Inventory Tracking:
     * - Links top-up to specific product
     * - Enables product inventory history
     * - Supports product-level analytics
     * - Facilitates stock level monitoring
     * 
     * Business Logic:
     * - Product must belong to specified business
     * - Product existence validated before top-up
     * - Product inventory updated after top-up record
     * - Supports product performance analysis
     * 
     * @field product
     * @type {ObjectId}
     * @ref "Product"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @validation product-business consistency
     * @example "64a7b8c9d12345e6f7890126"
     */
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    /**
     * User Reference
     * 
     * Reference to the User who performed the inventory top-up operation.
     * Provides user accountability and enables user-specific inventory
     * activity tracking and audit trails.
     * 
     * Accountability Features:
     * - Complete user action tracking
     * - Individual user inventory responsibilities
     * - User-specific activity reporting
     * - Access control and permission validation
     * 
     * Relationship Details:
     * - Many-to-one relationship (TopUps -> User)
     * - Required field ensuring user accountability
     * - ObjectId reference to User collection
     * - Enables user activity analysis
     * 
     * Audit Trail:
     * - Who performed the top-up operation
     * - User-specific inventory management patterns
     * - Individual performance tracking
     * - Responsibility and compliance tracking
     * 
     * Access Control:
     * - User must have business access permissions
     * - User authentication required for operations
     * - User role validation for inventory operations
     * 
     * @field user
     * @type {ObjectId}
     * @ref "User"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @purpose accountability
     * @accessControl required
     * @example "64a7b8c9d12345e6f7890127"
     */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    /**
     * Old Quantity - Pre-TopUp Inventory Level
     * 
     * Records the product inventory quantity before the top-up operation.
     * Essential for audit trails and calculating the exact impact of
     * inventory additions.
     * 
     * Data Integrity:
     * - Captured at time of top-up operation
     * - Immutable record of pre-operation state
     * - Required for complete audit trail
     * - Validates inventory change calculations
     * 
     * Business Logic:
     * - oldQuantity + quantityAdded = newQuantity
     * - Enables inventory change validation
     * - Supports inventory reconciliation
     * - Historical inventory state preservation
     * 
     * Audit Capabilities:
     * - Before/after quantity comparison
     * - Inventory change magnitude tracking
     * - Historical inventory level analysis
     * - Data consistency validation
     * 
     * @field oldQuantity
     * @type {Number}
     * @required true
     * @validation non-negative
     * @purpose audit-trail
     * @immutable true
     * @example 150
     */
    oldQuantity: { type: Number, required: true },

    /**
     * New Quantity - Post-TopUp Inventory Level
     * 
     * Records the product inventory quantity after the top-up operation
     * is completed. Represents the final inventory state following the
     * stock addition.
     * 
     * Calculation Logic:
     * - newQuantity = oldQuantity + quantityAdded
     * - Automatically calculated during top-up operation
     * - Validates against business rules and constraints
     * - Ensures data consistency across inventory records
     * 
     * State Management:
     * - Final inventory level after top-up
     * - Used to update Product inventory field
     * - Basis for subsequent inventory operations
     * - Inventory state validation reference
     * 
     * Business Rules:
     * - Must be greater than oldQuantity
     * - Must equal oldQuantity + quantityAdded
     * - Cannot exceed maximum inventory limits (if configured)
     * - Validates successful inventory addition
     * 
     * @field newQuantity
     * @type {Number}
     * @required true
     * @validation must be > oldQuantity
     * @calculation oldQuantity + quantityAdded
     * @purpose final-state
     * @example 275
     */
    newQuantity: { type: Number, required: true },

    /**
     * Quantity Added - Top-Up Amount
     * 
     * Specifies the exact quantity of inventory added during the top-up
     * operation. Represents the magnitude of the inventory increase and
     * forms the core business data for the transaction.
     * 
     * Validation Rules:
     * - Required field for all top-up operations
     * - Minimum value of 1 (cannot add zero or negative quantities)
     * - Custom validation message for business rule violations
     * - Positive integer constraint enforcement
     * 
     * Business Logic:
     * - Represents actual inventory addition amount
     * - Used in inventory calculations and updates
     * - Basis for cost calculations and reporting
     * - Key metric for inventory replenishment analysis
     * 
     * Operational Impact:
     * - Directly affects product inventory levels
     * - Influences inventory valuation calculations
     * - Supports supplier performance analysis
     * - Enables inventory turnover calculations
     * 
     * Reporting Applications:
     * - Total inventory additions by period
     * - Average top-up quantities per product
     * - Inventory replenishment patterns
     * - Stock management efficiency metrics
     * 
     * @field quantityAdded
     * @type {Number}
     * @required true
     * @min 1
     * @validation "Quantity added must be at least 1"
     * @purpose transaction-core
     * @businessRules positive-only
     * @example 125
     */
    quantityAdded: {
      type: Number,
      required: true,
      min: [1, "Quantity added must be at least 1"],
    },
  },
  {
    /**
     * TopUp Schema Configuration
     * 
     * Enables automatic timestamp management for complete audit trail
     * and temporal tracking of inventory top-up operations.
     * 
     * @config timestamps
     * @value true
     * @fields createdAt, updatedAt
     * @purpose audit-trail
     */
    timestamps: true,
  }
);

/**
 * UsageHistory Schema - Inventory Stock Consumption Tracking
 * 
 * Records all inventory consumption operations including sales, usage,
 * waste, and inventory reductions. Maintains complete audit trail for
 * inventory depletion and business operations.
 * 
 * Business Process Flow:
 * 1. User initiates inventory usage operation
 * 2. System records current quantity (oldQuantity)
 * 3. User specifies quantity used (quantityUsed)
 * 4. System calculates new quantity (newQuantity)
 * 5. UsageHistory record created with complete transaction details
 * 6. Product inventory updated to new quantity
 * 
 * Usage Scenarios:
 * - Product sales and customer orders
 * - Internal consumption and usage
 * - Waste, damage, and loss tracking
 * - Inventory adjustments and corrections
 */
const UsageHistorySchema = new mongoose.Schema(
  {
    /**
     * Business Reference
     * 
     * Reference to the Business where the inventory usage occurred.
     * Provides business context and enables business-scoped usage
     * tracking and analysis within the multi-tenant system.
     * 
     * Multi-Tenancy Features:
     * - Business-scoped usage history isolation
     * - Prevents cross-business data access
     * - Supports business-specific usage reporting
     * - Enables business owner access control
     * 
     * Business Operations:
     * - Usage records tied to business context
     * - Business deletion affects usage history
     * - Business ownership controls access
     * - Supports business performance analysis
     * 
     * @field business
     * @type {ObjectId}
     * @ref "Business"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @multiTenant business-scoped
     * @example "64a7b8c9d12345e6f7890125"
     */
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    /**
     * Product Reference
     * 
     * Reference to the specific Product that had inventory consumed.
     * Enables product-specific usage tracking and detailed consumption
     * pattern analysis.
     * 
     * Usage Analytics:
     * - Product-specific consumption patterns
     * - Usage velocity and trends
     * - Product performance metrics
     * - Inventory turnover analysis
     * 
     * Business Intelligence:
     * - Popular product identification
     * - Seasonal usage pattern recognition
     * - Inventory planning optimization
     * - Product lifecycle analysis
     * 
     * @field product
     * @type {ObjectId}
     * @ref "Product"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @analytics consumption-patterns
     * @example "64a7b8c9d12345e6f7890126"
     */
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    /**
     * User Reference
     * 
     * Reference to the User who performed the inventory usage operation.
     * Provides user accountability and enables user-specific usage
     * activity tracking and performance analysis.
     * 
     * Accountability Tracking:
     * - Individual user usage responsibilities
     * - User-specific consumption patterns
     * - Performance and efficiency metrics
     * - Compliance and audit requirements
     * 
     * Usage Analysis:
     * - User productivity measurements
     * - Individual usage trends
     * - Training and performance insights
     * - Resource allocation optimization
     * 
     * @field user
     * @type {ObjectId}
     * @ref "User"
     * @required true
     * @indexed true
     * @relationship many-to-one
     * @purpose accountability
     * @analytics user-performance
     * @example "64a7b8c9d12345e6f7890127"
     */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    /**
     * Old Quantity - Pre-Usage Inventory Level
     * 
     * Records the product inventory quantity before the usage operation.
     * Critical for audit trails and validating inventory consumption
     * calculations.
     * 
     * Audit Validation:
     * - Pre-operation inventory state
     * - Usage calculation verification
     * - Historical inventory tracking
     * - Data consistency validation
     * 
     * Business Logic:
     * - oldQuantity - quantityUsed = newQuantity
     * - Ensures sufficient inventory for usage
     * - Validates inventory change calculations
     * - Prevents negative inventory scenarios
     * 
     * @field oldQuantity
     * @type {Number}
     * @required true
     * @validation non-negative
     * @purpose audit-verification
     * @businessRule sufficient-inventory
     * @example 275
     */
    oldQuantity: { type: Number, required: true },

    /**
     * New Quantity - Post-Usage Inventory Level
     * 
     * Records the product inventory quantity after the usage operation
     * is completed. Represents the remaining inventory state following
     * the stock consumption.
     * 
     * Calculation Validation:
     * - newQuantity = oldQuantity - quantityUsed
     * - Must be non-negative (prevents overselling)
     * - Validates successful inventory reduction
     * - Ensures inventory consistency
     * 
     * Inventory Management:
     * - Final inventory level after usage
     * - Used to update Product inventory field
     * - Basis for low-stock alerts
     * - Inventory planning reference
     * 
     * @field newQuantity
     * @type {Number}
     * @required true
     * @validation must be >= 0
     * @calculation oldQuantity - quantityUsed
     * @purpose remaining-inventory
     * @example 225
     */
    newQuantity: { type: Number, required: true },

    /**
     * Quantity Used - Consumption Amount
     * 
     * Specifies the exact quantity of inventory consumed during the usage
     * operation. Represents the magnitude of inventory reduction and core
     * business transaction data.
     * 
     * Validation Constraints:
     * - Required field for all usage operations
     * - Minimum value of 1 (cannot use zero or negative quantities)
     * - Custom validation message for business rule enforcement
     * - Positive integer constraint validation
     * 
     * Business Applications:
     * - Sales transaction quantities
     * - Production consumption amounts
     * - Waste and loss quantities
     * - Inventory adjustment amounts
     * 
     * Analytics Value:
     * - Usage velocity calculations
     * - Demand pattern analysis
     * - Inventory turnover metrics
     * - Product performance indicators
     * 
     * Operational Control:
     * - Cannot exceed available inventory
     * - Prevents negative inventory states
     * - Validates against business rules
     * - Supports inventory forecasting
     * 
     * @field quantityUsed
     * @type {Number}
     * @required true
     * @min 1
     * @validation "Quantity used must be at least 1"
     * @purpose transaction-core
     * @businessRules positive-only, sufficient-inventory
     * @example 50
     */
    quantityUsed: {
      type: Number,
      required: true,
      min: [1, "Quantity used must be at least 1"],
    },
  },
  {
    /**
     * UsageHistory Schema Configuration
     * 
     * Enables automatic timestamp management for complete audit trail
     * and temporal tracking of inventory usage operations.
     * 
     * @config timestamps
     * @value true
     * @fields createdAt, updatedAt
     * @purpose audit-trail
     */
    timestamps: true,
  }
);

/**
 * Database Indexes - Inventory Tracking Performance Optimization
 * 
 * Strategic indexes designed for optimal query performance in inventory
 * tracking operations, reporting, and analytics across multi-tenant
 * business operations.
 */

/**
 * TopUp Schema Indexes
 * 
 * Performance optimization indexes for top-up operations and reporting.
 */

/**
 * Business-Product Composite Index (TopUp)
 * 
 * Optimizes queries for product-specific top-up history within business scope.
 * Essential for product inventory analysis and replenishment reporting.
 * 
 * @index topup-business-product
 * @fields business (1), product (1)
 * @queries product top-up history, business product analysis
 */
TopUpSchema.index({ business: 1, product: 1 });

/**
 * Business-User Composite Index (TopUp)
 * 
 * Optimizes queries for user-specific top-up activities within business scope.
 * Supports user performance analysis and accountability reporting.
 * 
 * @index topup-business-user
 * @fields business (1), user (1)
 * @queries user top-up activity, performance analysis
 */
TopUpSchema.index({ business: 1, user: 1 });

/**
 * Business-Timestamp Index (TopUp)
 * 
 * Optimizes chronological queries for business top-up activities.
 * Essential for temporal analysis and recent activity reporting.
 * 
 * @index topup-business-time
 * @fields business (1), createdAt (-1)
 * @queries recent top-ups, temporal analysis
 */
TopUpSchema.index({ business: 1, createdAt: -1 });

/**
 * Comprehensive Product Timeline Index (TopUp)
 * 
 * Advanced composite index for detailed product top-up timeline analysis.
 * Supports complex queries combining business, product, and temporal filters.
 * 
 * @index topup-comprehensive
 * @fields business (1), product (1), createdAt (-1)
 * @queries product timeline analysis, detailed reporting
 */
TopUpSchema.index({ business: 1, product: 1, createdAt: -1 });

/**
 * UsageHistory Schema Indexes
 * 
 * Performance optimization indexes for usage tracking and consumption analysis.
 */

/**
 * Business-Product Composite Index (Usage)
 * 
 * Optimizes queries for product-specific usage history within business scope.
 * Critical for product consumption analysis and demand forecasting.
 * 
 * @index usage-business-product
 * @fields business (1), product (1)
 * @queries product usage patterns, consumption analysis
 */
UsageHistorySchema.index({ business: 1, product: 1 });

/**
 * Business-User Composite Index (Usage)
 * 
 * Optimizes queries for user-specific usage activities within business scope.
 * Supports user productivity analysis and performance tracking.
 * 
 * @index usage-business-user
 * @fields business (1), user (1)
 * @queries user usage patterns, productivity metrics
 */
UsageHistorySchema.index({ business: 1, user: 1 });

/**
 * Business-Timestamp Index (Usage)
 * 
 * Optimizes chronological queries for business usage activities.
 * Essential for temporal usage analysis and trend identification.
 * 
 * @index usage-business-time
 * @fields business (1), createdAt (-1)
 * @queries recent usage, temporal trends
 */
UsageHistorySchema.index({ business: 1, createdAt: -1 });

/**
 * Comprehensive Usage Analytics Index
 * 
 * Advanced composite index for detailed usage analytics combining business,
 * product, user, and temporal dimensions for comprehensive reporting.
 * 
 * @index usage-comprehensive
 * @fields business (1), product (1), user (1), createdAt (-1)
 * @queries comprehensive usage analytics, detailed reporting
 */
UsageHistorySchema.index({ business: 1, product: 1, user: 1, createdAt: -1 });

/**
 * Model Instances - Inventory Tracking Operations
 * 
 * Compiled Mongoose models for inventory tracking schema operations.
 * Provide comprehensive CRUD operations and specialized inventory methods.
 */

/**
 * TopUp Model Instance
 * 
 * Handles all inventory addition operations and top-up history management.
 * Supports business-scoped inventory replenishment tracking and analytics.
 * 
 * Key Operations:
 * - TopUp.create(): Record new inventory addition
 * - TopUp.find(): Query top-up history with business scoping
 * - TopUp.aggregate(): Complex top-up analytics and reporting
 * 
 * @model TopUp
 * @collection topups
 * @schema TopUpSchema
 * @purpose inventory-additions
 */
const TopUp = mongoose.model("TopUp", TopUpSchema);

/**
 * UsageHistory Model Instance
 * 
 * Handles all inventory consumption operations and usage history management.
 * Supports business-scoped inventory consumption tracking and analytics.
 * 
 * Key Operations:
 * - UsageHistory.create(): Record new inventory consumption
 * - UsageHistory.find(): Query usage history with business scoping
 * - UsageHistory.aggregate(): Complex usage analytics and reporting
 * 
 * @model UsageHistory
 * @collection usagehistories
 * @schema UsageHistorySchema
 * @purpose inventory-consumption
 */
const UsageHistory = mongoose.model("UsageHistory", UsageHistorySchema);

export { TopUp, UsageHistory };