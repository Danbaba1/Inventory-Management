import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxLength: 200,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    isAvailable: { type: Boolean, default: true },
    description: { type: String, maxLength: 1000 },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isAvailable: 1 });

ProductSchema.virtual("inStock").get(function () {
  return this.quantity > 0 && this.isAvailable;
});

const Product = new mongoose.model("Product", ProductSchema);
export default Product;
