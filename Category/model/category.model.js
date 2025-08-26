import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    isActive: { type: Boolean, default: true },
    description: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1 }, { unique: true });
CategorySchema.index({ isActive: 1 });

const Category = mongoose.model("Category", CategorySchema);
export default Category;
