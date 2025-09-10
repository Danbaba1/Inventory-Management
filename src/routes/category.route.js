import express from "express";
import CategoryController from "../controllers/category.controller.js";
import {
  authenticateUser,
  //   authorizeAdmin,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/category", authenticateUser, CategoryController.createCategory);

router.get("/categories", authenticateUser, CategoryController.getCategories);

router.put("/category", authenticateUser, CategoryController.updateCategory);

router.delete("/category", authenticateUser, CategoryController.deleteCategory);

// router.post("/admin/category", authorizeAdmin, CategoryController.createCategory);
// router.get("/admin/categories", authorizeAdmin, CategoryController.getCategories);
// router.put("/admin/category", authorizeAdmin, CategoryController.updateCategory);
// router.delete("/admin/category", authorizeAdmin, CategoryController.deleteCategory);

export { router as CategoryRoutes };
