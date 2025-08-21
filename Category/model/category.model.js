import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  name: String,
  isActive: Boolean,
  Description: String,
});

const Category = mongoose.model("Category", CategorySchema);
model.exports = Category;
