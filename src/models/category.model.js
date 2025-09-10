import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    isActive: { type: Boolean, default: true },
    description: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1, business: 1 }, { unique: true });
CategorySchema.index({ business: 1, isActive: 1 });

const Category = mongoose.model("Category", CategorySchema);
export default Category;
