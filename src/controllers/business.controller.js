import BusinessService from "../services/business.service.js";

class BusinessController {
  static async register(req, res) {
    try {
      const { userId } = req.query;
      const businessData = {
        name: req.body.name,
        type: req.body.type,
        categories: req.body.categories || [],
        description: req.body.categories || "",
        address: req.body.categories || {},
        contactInfo: req.body.contactInfo || {},
      };

      const result = await BusinessService.registerBusiness(
        businessData,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      if (
        err.name === "Please provide both name and type" ||
        err.name === "User ID is required to register a business" ||
        err.name === "Business with this name already exists"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error registering business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error registering business",
      });
    }
  }

  static async getBusinesses(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (page < 1) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Limit must be between 1 and 100",
        });
      }

      const filters = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.owner) filters.owner = req.query.owner;
      if (req.query.search) filters.search = req.query.search;

      const result = await BusinessService.getBusinesses(page, limit, filters);

      res.status(200).json({
        message: "Businesses retrieved successfully",
        ...result,
      });
    } catch (err) {
      console.error("Error getting businesses", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving businesses",
      });
    }
  }

  static async updateBusiness(req, res) {
    try {
      const { id, userId } = req.query;
      const updateData = {
        name: req.body.name,
        type: req.body.type,
        categories: req.body.categories,
        description: req.body.description,
        address: req.body.address,
        contactInfo: req.body.contactInfo,
      };

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const result = await BusinessService.updateBusiness(
        id,
        updateData,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      if (
        err.name === "Please provide your business ID" ||
        err.name === "Business does not exist" ||
        err.name === "You are not authorized to update this business"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error updating business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error updating business",
      });
    }
  }

  static async deleteBusiness(req, res) {
    try {
      const { id, userId } = req.query;

      const result = await BusinessService.deleteBusiness(id, userId);

      res.status(200).json(result);
    } catch (err) {
      if (
        err.name === "Business ID is required" ||
        err.name === "Business does not exist" ||
        err.name === "You are not authorized to delete this business"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error deleting business", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error deleting business",
      });
    }
  }
}

export default BusinessController;
