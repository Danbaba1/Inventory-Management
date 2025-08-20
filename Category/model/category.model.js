import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  name: String,
  isActive: Boolean,
  Description: String,
});

const CategoryModel = mongoose.model("CategoryModel", CategorySchema);
