import mongoose from "mongoose";

const BusinessSchema = new mongoose.Schema({
  name: { type: String },
  type: {
    name: { type: String },
  },
});

const Business = mongoose.model("Business", BusinessSchema);
export default Business;
