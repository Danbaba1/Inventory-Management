import express from "express";
import ProductController from "../controllers/product.controller.js";
import {
  authenticateUser,
  //   authorizeAdmin,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/product", authenticateUser, ProductController.createProduct);

router.get("/products", authenticateUser, ProductController.getProducts);

router.put("/product", authenticateUser, ProductController.updateProduct);

router.delete("/product", authenticateUser, ProductController.deleteProduct);

// router.post("/admin/product", authorizeAdmin, ProductController.createProduct);
// router.get("/admin/products", authorizeAdmin, ProductController.getProducts);
// router.put("/admin/product", authorizeAdmin, ProductController.updateProduct);
// router.delete("/admin/product", authorizeAdmin, ProductController.deleteProduct);

export { router as ProductRoutes };
