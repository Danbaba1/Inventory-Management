import express from "express";
import { UserRoutes } from "./User/routes/user.route.js";
import { ProductRoutes } from "./Product/routes/product.route.js";
import { CategoryRoutes } from "./Category/routes/category.route.js";
import { InventoryRoutes } from "./Inventory/routes/inventory.route.js";
import { BusinessRoutes } from "./Business/routes/business.route.js";

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
