import express from "express";
import UserRoutes from "./User/routes/user.route.js";

const app = express();

import { DB } from "./db.js";

DB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("./users", UserRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

export default app;
