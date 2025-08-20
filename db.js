import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export function DB() {
  mongoose
    .connect(process.env.DB)
    .then(() => console.log("DB connected successfully"))
    .catch((err) => console.error(err));
}
