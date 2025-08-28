import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
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

ProductSchema.index({ name: 1, business: 1 }, { unique: true });
ProductSchema.index({ business: 1, category: 1 });
ProductSchema.index({ business: 1, isAvailable: 1 });

ProductSchema.index({ business: 1, category: 1, isAvailable: 1 });
ProductSchema.index({ business: 1, name: "text", description: "text" });

ProductSchema.virtual("inStock").get(function () {
  return this.quantity > 0 && this.isAvailable;
});

const Product = mongoose.model("Product", ProductSchema);
export default Product;
