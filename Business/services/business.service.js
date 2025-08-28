import Business from "../model/business.model.js";

class BusinessService {
  static async registerBusiness(businessData, userId) {
    try {
      const {
        name,
        type,
        categories = [],
        description = "",
        address = {},
        contactInfo = {},
      } = businessData;

      if (!name || !type) {
        throw new Error("Please provide both name and type");
      }

      if (!userId) {
        throw new Error("User ID is required to register a business");
      }

      const existingBusiness = await Business.findOne({ name });
      if (existingBusiness) {
        throw new Error("Business with this name already exists");
      }

      const newBusiness = new Business({
        name: name.trim(),
        type: type.trim(),
        categories,
        description: description.trim(),
        address,
        contactInfo,
        owner: userId,
        isActive: true,
      });

      await newBusiness.save();

      await newBusiness.populate([
        { path: "owner", select: "name email" },
        { path: "categories", select: "name description" },
      ]);

      return {
        message: "Business registered successfully",
        business: newBusiness,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async getBusinesses(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;

      const query = { isActive: true };

      if (filters.type) query.type = filters.type;
      if (filters.owner) query.owner = filters.owner;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { description: { $regex: filters.search, $options: "i" } },
        ];
      }

      const businesses = await Business.find({ isActive: true })
        .populate("categories", "name description")
        .populate("owner", "name email")
        .skip(skip)
        .limit(limit)
        .sort({
          createdAt: -1,
        });

      const total = await Business.countDocuments(query);

      return {
        businesses,
        pagination: {
          currentPage: page,
          totalPage: Math.ceil(total / limit),
          totalBusinesses: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async updateBusiness(id, updateData, userId) {
    try {
      if (!id) {
        throw new Error("Please provide your business ID");
      }

      const business = await Business.findById(id);
      if (!business) {
        throw new Error("Business does not exist");
      }

      if (business.owner.toString() !== userId.toString()) {
        throw new Error("You are not authorized to update this business");
      }

      const { name, type, categories, description, address, contactInfo } =
        updateData;

      if (name && name !== business.name) {
        const existingBusiness = await Business.findOne({
          name: name.trim(),
          _id: { $ne: id },
        });
        if (existingBusiness) {
          throw new Error("Business with this name already exists");
        }
      }

      if (name) business.name = name;
      if (type) business.type = type;
      if (categories !== undefined) business.categories = categories;
      if (description !== undefined) business.description = description.trim();
      if (address !== undefined) {
        business.address = { ...business.address.toObject(), ...address };
      }
      if (contactInfo !== undefined) {
        business.contactInfo = {
          ...business.contactInfo.toObject(),
          ...contactInfo,
        };
      }

      const updatedBusiness = await business.save();
      await updatedBusiness.populate([
        { path: "owner", select: "name email" },
        { path: "categories", select: "name description" },
      ]);

      return {
        message: "Business updated successfully",
        business: updatedBusiness,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async deleteBusiness(id, userId) {
    try {
      if (!id) {
        throw new Error("Business ID is required");
      }

      const business = await Business.findById(id);
      if (!business) {
        throw new Error("Business does not exist");
      }

      if (business.owner.toString() !== userId.toString()) {
        throw new Error("You are not authorized to delete this business");
      }

      business.isActive = false;
      await business.save();

      return "Business deactivated successfully";

      // await Business.findByIdAndDelete(id);
      // return "Business deleted successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default BusinessService;
