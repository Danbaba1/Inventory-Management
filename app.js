import express from "express";
import cors from 'cors';
import swaggerJSDoc from "swagger-jsdoc";
import { serve, setup } from "swagger-ui-express";
import { UserRoutes } from "./src/routes/user.route.js";
import { ProductRoutes } from "./src/routes/product.route.js";
import { CategoryRoutes } from "./src/routes/category.route.js";
import { InventoryRoutes } from "./src/routes/inventory.route.js";
import { BusinessRoutes } from "./src/routes/business.route.js";
import { ProductionRoutes } from "./src/routes/production.route.js";
import errorHandler from "./src/middleware/errorHandler.js";

import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Inventory Management API',
            version: '1.0.0',
            description: 'Comprehensive API for managing businesses, products, categories, and inventory',
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use("/api-docs", serve, setup(swaggerSpec));

app.use("/api/users", UserRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/categories", CategoryRoutes);
app.use("/api/inventory", InventoryRoutes);
app.use("/api/businesses", BusinessRoutes);
app.use("/api/production-lines", ProductionRoutes);

app.use(errorHandler);

export default app;
