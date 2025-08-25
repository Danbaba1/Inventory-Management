import mongoose from "mongoose";

TopUpSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    quantityAdded: { type: Number, required: true },
  },
  { timestamps: true }
);

UsageHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    quantityUsed: { type: Number, required: true },
  },
  { timestamps: true }
);

TopUpSchema.index({ product: 1 });
TopUpSchema.inddex({ user: 1 });

UsageHistorySchema.index({ product: 1 });
UsageHistorySchema.inddex({ user: 1 });

const TopUp = new mongoose.model("TopUp", TopUpSchema);
const UsageHistory = new mongoose.model("UsageHistory", UsageHistorySchema);

export { TopUp, UsageHistory };
