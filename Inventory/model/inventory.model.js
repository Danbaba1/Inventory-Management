import mongoose from "mongoose";

TopUpSchema = new mongoose.Schema({
  Product: String,
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  OldQuantity: Number,
  NewQuantity: Number,
  QuantityAdded: Number,
  Date: { type: Date, default: Date.now },
});

UsageHistory = new mongoose.Schema({
  Product: String,
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  OldQuantity: Number,
  NewQuantity: Number,
  QuantityAdded: Number,
  Date: { type: Date, default: Date.now },
});

const TopUp = new mongoose.model("TopUp", TopUpSchema);
const UsageHistory = new mongoose.model("UsageHistory", UsageHistorySchema);
export { TopUp, UsageHistory };
