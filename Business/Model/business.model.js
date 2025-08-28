import mongoose from "mongoose";

const BusinessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      sipCode: String,
      country: String,
    },
    contactInfo: {
      email: String,
      phone: String,
      website: String,
    },
  },
  {
    timestamps: true,
    indexes: [{ name: 1 }, { owner: 1 }, { isActive: 1 }, { type: 1 }],
  }
);

const Business = mongoose.model("Business", BusinessSchema);
export default Business;
