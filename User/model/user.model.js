import mongoose from "mongoose";
import UserType from "./user.type";

const UserSchema = new mongoose.Schema({
  Name: String,
  IsActive: Boolean,
  Phone: String,
  Password: String,
  Email: String,
  UserType: UserType,
});

const User = new mongoose.model("User", UserSchema);
model.exports = User;
