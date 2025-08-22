import mongoose from "mongoose";
import Category from "../Category/model/category.model";

const ProductSchema = new mongoose.Schema({
  Name: String,
  Category: Category,
  Price: Number,
  Quantity: Number,
  IsAvailable: Boolean,
  Description: String,
});

const Product = new mongoose.model("Product", ProductSchema);
export default Product;
