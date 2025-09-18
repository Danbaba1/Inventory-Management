import express from "express";
import cors from 'cors';
import { UserRoutes } from "./src/routes/user.route.js";
import { ProductRoutes } from "./src/routes/product.route.js";
import { CategoryRoutes } from "./src/routes/category.route.js";
import { InventoryRoutes } from "./src/routes/inventory.route.js";
import { BusinessRoutes } from "./src/routes/business.route.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", UserRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/categories", CategoryRoutes);
app.use("/api/inventory", InventoryRoutes);
app.use("/api/businesses", BusinessRoutes);

export default app;
