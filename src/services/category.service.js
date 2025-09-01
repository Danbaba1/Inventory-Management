import Category from "../models/category.model.js";

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
        message: "Category created successfully",
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
          isActive: category.isActive,
          createdAt: category.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async getCategories(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const categories = await Category.find({ isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1,
        });

      const total = await Category.countDocuments({ isActive: true });
      return {
        categories,
        pagination: {
          currentPage: page,
          totalPage: Math.ceil(total / limit),
          totalCategories: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
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

      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name,
          _id: { $ne: id },
        });
        if (existingCategory) {
          throw new Error("Category with name already exists");
        }
      }

      if (name) category.name = name;
      if (description !== undefined) category.description = description;

      const updatedCategory = await category.save();
      return {
        message: "Category updated successfully",
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
      const category = await Category.findById(id);

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
