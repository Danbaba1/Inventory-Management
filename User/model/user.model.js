import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    phone: { type: String },
    password: { type: String, required: true },
    email: { type: String, required: true },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ resetToken: 1 });

UserSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

const User = mongoose.model("User", UserSchema);
export default User;
