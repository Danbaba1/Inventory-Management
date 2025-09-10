import Category from "../models/category.model.js";
import Business from "../models/business.model.js";

class CategoryService {
  static async createCategory(name, description, userId) {
    try {
      if (!name || !name.trim()) {
        throw new Error("Please provide a valid category name");
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
          "You must register a business before creating categories"
        );
      }

      const existingCategory = await Category.findOne({
        name: name.trim(),
        business: userBusiness._id,
      });

      if (existingCategory) {
        throw new Error("Category with this name already exists");
      }

      const category = new Category({
        name: name.trim(),
        description: description?.trim(),
        business: userBusiness._id,
      });

      await category.save();

      await Business.findByIdAndUpdate(
        userBusiness._id,
        { $push: { categories: category._id } },
        { new: true }
      );

      await category.populate("business", "name type");

      return {
        message: "Category created successfully",
        category: {
          id: category._id,
          name: category.name,
          business: category.business,
          description: category.description,
          isActive: category.isActive,
          createdAt: category.createdAt,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async getCategories(page = 1, limit = 10, userId) {
    try {
      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must register a business to view categories");
      }

      const skip = (page - 1) * limit;

      const categories = await Category.find({
        business: userBusiness._id,
        isActive: true,
      })
        .populate("business", "name type")
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1,
        });

      const total = await Category.countDocuments({
        business: userBusiness._id,
        isActive: true,
      });

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

  static async updateCategory(id, name, description, userId) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to update categories");
      }

      const category = await Category.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!category) {
        throw new Error("Category does not exist");
      }

      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name: name.trim(),
          business: userBusiness._id,
          _id: { $ne: id },
        });
        if (existingCategory) {
          throw new Error("Category with name already exists");
        }
      }

      if (name) category.name = name.trim();
      if (description !== undefined) category.description = description?.trim();

      const updatedCategory = await category.save();
      await updatedCategory.populate("business", "name type");

      return {
        message: "Category updated successfully",
        category: updatedCategory,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async deleteCategory(id, userId) {
    try {
      if (!id) {
        throw new Error("Category ID is required");
      }

      if (!userId) {
        throw new Error("User authentication required");
      }

      const userBusiness = await Business.findOne({
        owner: userId,
        isActive: true,
      });

      if (!userBusiness) {
        throw new Error("You must own a business to delete categories");
      }

      const category = await Category.findOne({
        _id: id,
        business: userBusiness._id,
      });

      if (!category) {
        throw new Error("Category does not exist");
      }

      category.isActive = false;
      await category.save();

      await Business.findByIdAndUpdate(
        userBusiness._id,
        { $pull: { categories: category._id } },
        { new: true }
      );

      // await Category.findByIdAndDelete(id);
      return "Category deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default CategoryService;
