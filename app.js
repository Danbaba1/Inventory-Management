import express from "express";
import { UserRoutes } from "./user/routes/user.route.js";
import { ProductRoutes } from "./product/routes/product.route.js";
import { CategoryRoutes } from "./category/routes/category.route.js";
import { InventoryRoutes } from "./inventory/routes/inventory.route.js";
import { BusinessRoutes } from "./business/routes/business.route.js";

const app = express();

import { DB } from "./db.js";

DB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", UserRoutes);
app.use("/api", ProductRoutes);
app.use("/api", CategoryRoutes);
app.use("/api", InventoryRoutes);
app.use("/api", BusinessRoutes);

export default app;
