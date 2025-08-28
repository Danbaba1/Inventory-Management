import mongoose from "mongoose";

const TopUpSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    quantityAdded: {
      type: Number,
      required: true,
      min: [1, "Quantity added must be at least 1"],
    },
  },
  { timestamps: true }
);

const UsageHistorySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    quantityUsed: {
      type: Number,
      required: true,
      min: [1, "Quantity used must be at least 1"],
    },
  },
  { timestamps: true }
);

TopUpSchema.index({ business: 1, product: 1 });
TopUpSchema.index({ business: 1, user: 1 });
TopUpSchema.index({ business: 1, createdAt: -1 });

UsageHistorySchema.index({ business: 1, product: 1 });
UsageHistorySchema.index({ business: 1, user: 1 });
UsageHistorySchema.index({ business: 1, createdAt: -1 });

TopUpSchema.index({ business: 1, product: 1, createdAt: -1 });
UsageHistorySchema.index({ business: 1, product: 1, user: 1, createdAt: -1 });

const TopUp = mongoose.model("TopUp", TopUpSchema);
const UsageHistory = mongoose.model("UsageHistory", UsageHistorySchema);

export { TopUp, UsageHistory };
