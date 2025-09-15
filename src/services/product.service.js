import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Business from "../models/business.model.js";

/**
 * PRODUCT SERVICE
 * Manages product catalog within business and category context
 * Enforces business ownership and maintains product-category relationships
 */
class ProductService {
  /**
   * Create new product within user's business and category
   * 
   * @description Complex workflow with multi-level validation and relationship establishment
   * 
   * Algorithm:
   * 1. Validate all required inputs with type checking
   * 2. Verify user has active business (prerequisite)
   * 3. Validate category exists within user's business
   * 4. Check product name uniqueness within business scope
   * 5. Create product and establish bidirectional relationships
   * 6. Return structured response with populated data
   * 
   * @param {string} name - Product name (required, trimmed, unique per business)
   * @param {string} categoryId - Category ObjectId (must belong to user's business)
   * @param {number} quantity - Initial inventory quantity (must be >= 0)
   * @param {number} price - Product price (must be >= 0)
   * @param {string} description - Product description (optional, trimmed)
   * @param {string} userId - User ID for business ownership verification
   * 
   * @returns {Object} Creation result with message and product data
   * @throws {Error} Validation, authorization, relationship errors
   */
  static async createProduct(
    name,
    categoryId,
    quantity,
    price,
    description,
    userId
  ) {
    try {
      // Comprehensive input validation
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid product name");
      }

      if (!categoryId) {
        throw new Error("Please provide a category");
      }

      // Business rule validation for price
      if (price === undefined || price < 0) {
        throw new Error("Please provide a valid price");
      }

      // Business rule validation for quantity
      if (quantity === undefined || quantity < 0) {
        throw new Error("Please provide a valid quantity");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      // Business ownership verification (prerequisite check)
      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error(
          "You must register a business before creating products"
        );
      }

      // Category validation within business context
      // Ensures category belongs to user's business and is active
      const category = await Category.findOne({
        _id: categoryId,
        business: userBusiness._id,
        isActive: true,
      });

      if (!category) {
        throw new Error("Category does not exist in your business");
      }

      // Business-scoped uniqueness check for product names
      const existingProduct = await Product.findOne({
        name: name.trim(),
        business: userBusiness._id,
      });

      if (existingProduct) {
        throw new Error("Product with name already exists in your business");
      }

      // Create product entity with validated data
      const product = new Product({
        name: name.trim(),
        category: categoryId,
        business: userBusiness._id,
        quantity: Number(quantity), // Ensure numeric type
        price: Number(price), // Ensure numeric type
        description: description?.trim(),
        // isAvailable defaults to true from schema
      });

      await product.save();

      // Establish bidirectional relationship: add product to category
      await Category.findByIdAndUpdate(
        categoryId,
        { $push: { products: product._id } },
        { new: true }
      );

      // Populate relationships for comprehensive response
      await product.populate([
        { path: "category", select: "name description" },
        { path: "business", select: "name type" },
      ]);

      // Structured response with relevant fields
      return {
        message: "Product created successfully",
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          business: product.business,
          quantity: product.quantity,
          price: product.price,
          description: product.description,
          isAvailable: product.isAvailable,
          createdAt: product.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve paginated products for user's business
   * 
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {string} userId - User ID for business ownership verification
   * 
   * @returns {Object} Paginated products with metadata
   * @throws {Error} Authentication or business ownership errors
   */
  static async getProducts(page = 1, limit = 10, userId) {
    try {
      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must register a business to view products");
      }

      const skip = (page - 1) * limit;

      const products = await Product.find({
        business: userBusiness._id,
        isAvailable: true,
      })
        .populate("category", "name description")
        .populate("business", "name type")
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1,
        });

      const total = await Product.countDocuments({
        business: userBusiness._id,
        isAvailable: true,
      });

      return {
        products,
        pagination: {
          currentPage: page,
          totalPage: Math.ceil(total / limit),
          totalProducts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Update existing product within user's business
   * 
   * @param {string} id - Product ID to update
   * @param {Object} updateData - Fields to update
   * @param {string} userId - User ID for business ownership verification
   * 
   * @returns {Object} Update result with message and updated product
   * @throws {Error} Validation, authorization, or existence errors
   */
  static async updateProduct(id, updateData, userId) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to update products");
      }

      const product = await Product.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!product) {
        throw new Error("Product does not exist");
      }

      const { name, description, price, quantity, categoryId } = updateData;

      // Check name uniqueness if name is being updated
      if (name && name !== product.name) {
        const existingProduct = await Product.findOne({
          name: name.trim(),
          business: userBusiness._id,
          _id: { $ne: id },
        });
        if (existingProduct) {
          throw new Error(
            "Product with this name already exists in your business"
          );
        }
      }

      // Validate category if being updated
      if (categoryId) {
        const category = await Category.findOne({
          _id: categoryId,
          business: userBusiness._id,
          isActive: true,
        });

        if (!category) {
          throw new Error("Category does not exist in your business");
        }
        product.category = categoryId;
      }

      // Update fields if provided
      if (name) product.name = name.trim();
      if (description !== undefined) product.description = description?.trim();
      if (price !== undefined) product.price = Number(price);
      if (quantity !== undefined) product.quantity = Number(quantity);

      const updatedProduct = await product.save();
      await updatedProduct.populate([
        { path: "category", select: "name description" },
        { path: "business", select: "name type" },
      ]);

      return {
        message: "Product updated successfully",
        product: updatedProduct,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Soft delete product by setting isAvailable to false
   * Also removes product reference from category
   * 
   * @param {string} id - Product ID to delete
   * @param {string} userId - User ID for business ownership verification
   * 
   * @returns {string} Success message
   * @throws {Error} Authentication, authorization, or existence errors
   */
  static async deleteProduct(id, userId) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to delete products");
      }

      const product = await Product.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!product) {
        throw new Error("Product does not exist");
      }

      // Soft delete: mark as unavailable
      product.isAvailable = false;
      await product.save();

      // Remove product reference from category
      await Category.findByIdAndUpdate(
        product.category,
        {
          $pull: { products: product._id },
        },
        { new: true }
      );

      return "Product deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default ProductService;