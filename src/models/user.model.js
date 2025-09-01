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
    isEmailVerified: { type: Boolean, default: false },
    emailOTP: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    lastOTPSent: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ resetToken: 1 });
UserSchema.index({ emailOTP: 1 });

UserSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

UserSchema.methods.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

UserSchema.methods.canSendOTP = function () {
  if (!this.lastOTPSent) return true;
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  return this.lastOTPSent < oneMinuteAgo;
};

UserSchema.methods.canAttemptOTP = function () {
  return this.otpAttempts < 5; // Max 5 attempts
};

const User = mongoose.model("User", UserSchema);
export default User;
