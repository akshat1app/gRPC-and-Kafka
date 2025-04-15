const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  login_timestamp: { type: Date, default: Date.now() },
  activeStatus :{ type:Boolean, required: true },
  ipAddress: { type:String, required:true },
  deviceId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("userSession", userActivitySchema);
