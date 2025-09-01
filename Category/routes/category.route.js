import express from "express";
import CategoryController from "../controllers/category.controller.js";
import { authorizeAdmin } from "../../auth/auth.middleware.js";

const router = express.Router();

router.post("/category", authorizeAdmin, CategoryController.createCategory);

router.get("/categories", CategoryController.getCategories);

router.put("/category", authorizeAdmin, CategoryController.updateCategory);

router.delete("/category", authorizeAdmin, CategoryController.deleteCategory);

export { router as CategoryRoutes };
