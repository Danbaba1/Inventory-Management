import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Business from "../models/business.model.js";

class ProductService {
  static async createProduct(
    name,
    categoryId,
    quantity,
    price,
    description,
    userId
  ) {
    try {
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid product name");
      }

      if (!categoryId) {
        throw new Error("Please provide a category");
      }

      if (price === undefined || price < 0) {
        throw new Error("Please provide a valid price");
      }

      if (quantity === undefined || quantity < 0) {
        throw new Error("Please provide a valid quantity");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error(
          "You must register a business before creating products"
        );
      }

      const category = await Category.findById({
        _id: categoryId,
        business: userBusiness,
        isActive: true,
      });

      if (!category) {
        throw new Error("Category does not exist in your business");
      }

      const existingProduct = await Product.findOne({
        name: name.trim(),
        business: userBusiness._id,
      });

      if (existingProduct) {
        throw new Error("Product with name already exists in your business");
      }

      const product = new Product({
        name: name.trim(),
        category: categoryId,
        business: userBusiness._id,
        quantity: Number(quantity),
        price: Number(price),
        description: description?.trim(),
      });

      await product.save();

      await Category.findByIdAndUpdate(
        categoryId,
        { $push: { products: product._id } },
        { new: true }
      );

      await product.populate([
        { path: "category", select: "name description" },
        { path: "business", select: "name type" },
      ]);

      return {
        mesage: "Product created successfully",
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

  static async updateProduct(id, updateData, userId) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }

      if (!userId) {
        throw new Error("User authenticatio required");
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

      if (name && name === product.name) {
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

      product.isAvailable = false;
      await product.save();

      await Category.findByIdAndUpdate(
        product.category,
        {
          $pull: { products: product._id },
        },
        { new: true }
      );

      // await Product.findByIdAndDelete(id);
      return "Product deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default ProductService;
