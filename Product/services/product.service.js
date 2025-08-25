import Product from "../model/product.model.js";
import Category from "../model/category.model.js";

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

      const Product = new Product({
        name: name.trim(),
        category: category,
        quantity: Number(quantity),
        price: Number(price),
        description: description?.trim(),
      });

      await Product.save();

      await product.populate("category", "name description");

      return {
        mesage: "Product created successfully",
        Product: {
          id: Product._id,
          name: Product.name,
          category: Product.category,
          quantity: Product.quantity,
          price: Product.price,
          description: Product.description,
          isAvailable: Product.isAvailable,
          createdAt: Product.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async getProducts() {
    try {
      const products = await Product.find({ isAvailable: true })
        .populate("category", "name description")
        .sort({
          createdAt: -1,
        });
      return products;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async updateProduct(id, updateData) {
    try {
      if (!id) {
        throw new Error("Product ID is required");
      }
      const product = await Product.findById({ id });

      if (!product) {
        throw new Error("Product does not exist");
      }

      const { name, description, price, quantity, categoryId } = updateData;

      if (name === product.name) {
        throw new Error("Product with name already exists");
      }

      if (categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
          throw new Error("Category does not exist");
        }
      }

      if (name) product.name = name.trim();
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = Number(price);
      if (quantity !== undefined) product.quantity = Number(quantity);

      const updatedProduct = await Product.save();
      await updatedProduct.populate("category", "name description");
      return {
        message: " Product updated successfully",
        Product: updatedProduct,
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
      const Product = await Product.findById({ id });

      if (!Product) {
        throw new Error("Product does not exist");
      }

      await Product.findByIdAndDelete({ id });
      return "Product deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default ProductService;
