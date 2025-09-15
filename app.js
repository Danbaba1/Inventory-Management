import express from "express";
import { UserRoutes } from "./src/routes/user.route.js";
import { ProductRoutes } from "./src/routes/product.route.js";
import { CategoryRoutes } from "./src/routes/category.route.js";
import { InventoryRoutes } from "./src/routes/inventory.route.js";
import { BusinessRoutes } from "./src/routes/business.route.js";

const app = express();

import { DB } from "./src/database/db.js";

DB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", UserRoutes);
app.use("/api", ProductRoutes);
app.use("/api", CategoryRoutes);
app.use("/api/inventory", InventoryRoutes);
app.use("/api", BusinessRoutes);

export default app;
