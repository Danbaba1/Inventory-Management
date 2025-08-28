import Product from "../model/product.model.js";
import Category from "../../Category/model/category.model.js";

class ProductService {
  static async createProduct(name, categoryId, quantity, price, description) {
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

      const category = await Category.findById(categoryId);
      if (!category) {
        throw new Error("Category does not exist");
      }

      const existingProduct = await Product.findOne({ name });
      if (existingProduct) {
        throw new Error("Product with name already exists");
      }

      const product = new Product({
        name: name.trim(),
        category: categoryId,
        quantity: Number(quantity),
        price: Number(price),
        description: description?.trim(),
      });

      await product.save();

      await product.populate("category", "name description");

      return {
        mesage: "Product created successfully",
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
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

  static async getProducts(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const products = await Product.find({ isAvailable: true })
        .populate("category", "name description")
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1,
        });

      const total = await Product.countDocuments({ isAvailable: true });

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

  static async updateProduct(id, updateData) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }
      const product = await Product.findById(id);

      if (!product) {
        throw new Error("Product does not exist");
      }

      const { name, description, price, quantity, categoryId } = updateData;

      if (name && name === product.name) {
        const existingProduct = await Product.findOne({
          name,
          _id: { $ne: id },
        });
        if (existingProduct) {
          throw new Error("Product with name already exists");
        }
      }

      if (categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
          throw new Error("Category does not exist");
        }
        product.category = categoryId;
      }

      if (name) product.name = name.trim();
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = Number(price);
      if (quantity !== undefined) product.quantity = Number(quantity);

      const updatedProduct = await product.save();
      await updatedProduct.populate("category", "name description");
      return {
        message: "Product updated successfully",
        product: updatedProduct,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async deleteProduct(id) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }
      const product = await Product.findById(id);

      if (!product) {
        throw new Error("Product does not exist");
      }

      await Product.findByIdAndDelete(id);
      return "Product deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default ProductService;
