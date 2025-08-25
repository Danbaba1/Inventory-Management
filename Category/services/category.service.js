import Category from "../model/category.model.js";

class CategoryService {
  static async createCategory(name, description) {
    try {
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid category name");
      }

      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        throw new Error("Category with this name already exists");
      }

      const category = new Category({
        name: name.trim(),
        description: description?.trim(),
      });

      await category.save();
      return {
        mesage: "Category created successfully",
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
          isActive: catsgory.isActive,
          createdAt: category.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async getCategories() {
    try {
      const categories = await Category.find({ isActive: true }).sort({
        createdAt: -1,
      });
      return categories;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async updateCategory(id, name, description) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }
      const category = await Category.findById(id);

      if (!category) {
        throw new Error("Category does not exist");
      }

      if (category.name === name) {
        throw new Error("Category with name already exists");
      }

      category.name = name;
      category.description = description;

      const updatedCategory = await category.save();
      return {
        message: " Category updated successfully",
        category: updatedCategory,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async deleteCategory(id) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }
      const category = await Category.findById({ id });

      if (!category) {
        throw new Error("Category does not exist");
      }

      await Category.findByIdAndDelete(id);
      return "Category deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default CategoryService;
