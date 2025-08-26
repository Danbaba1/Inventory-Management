import express from "express";
import UserController from "../controllers/user.controller.js";
import { authorizeAdmin } from "../../auth/auth.middleware.js";

const router = express.Router();

router.post("/create/admin", UserController.createAdmin);

router.post("/register", UserController.register);

router.post("/login", UserController.login);

router.post("/forgot/password", UserController.forgotPassword);

router.post("/reset/password", UserController.resetPassword);

router.get("/users", authorizeAdmin, UserController.getUsers);

export { router as UserRoutes };
