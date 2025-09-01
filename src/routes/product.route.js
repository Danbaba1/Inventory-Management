import express from "express";
import ProductController from "../controllers/product.controller.js";
import { authorizeAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/product", authorizeAdmin, ProductController.createProduct);

router.get("/products", ProductController.getProducts);

router.put("/product", authorizeAdmin, ProductController.updateProduct);

router.delete("/product", authorizeAdmin, ProductController.deleteProduct);

export { router as ProductRoutes };
