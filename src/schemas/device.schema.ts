// import mongoose, { Schema } from "mongoose";

// const deviceSchema = new Schema(
//   {
//     // Link to User
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true, // For fast queries
//     },

//     // UNIQUE DEVICE IDENTIFIER (from react-native-device-info)
//     // This is the KEY to prevent duplicates!
//     deviceUniqueId: {
//       type: String,
//       required: true,
//       unique: true, // Ensures no duplicate devices across ALL users
//       index: true,
//     },

//     // PERMANENT DEVICE INFO (rarely changes)
//     deviceName: {
//       type: String,
//       required: true,
//       trim: true,
//       // e.g., "John's iPhone", "Samsung Galaxy S25"
//     },

//     brand: {
//       type: String,
//       required: true,
//       trim: true,
//       // e.g., "Apple", "Samsung", "Google"
//     },

//     model: {
//       type: String,
//       required: true,
//       trim: true,
//       // e.g., "iPhone 14 Pro", "SM-S911B" (Galaxy S23)
//     },

//     deviceType: {
//       type: String,
//       enum: ["Handset", "Tablet", "Tv", "Desktop", "Unknown"],
//       default: "Handset",
//     },

//     systemName: {
//       type: String,
//       required: true,
//       enum: ["iOS", "Android", "Windows", "unknown"],
//       // Operating system
//     },

//     systemVersion: {
//       type: String,
//       required: true,
//       // e.g., "17.2", "14"
//     },

//     // HARDWARE SPECS (permanent)
//     totalRAM: {
//       type: Number, // in bytes
//       required: true,
//     },

//     totalStorage: {
//       type: Number, // in bytes
//       required: true,
//     },

//     // APP INFO
//     appVersion: {
//       type: String,
//       required: true,
//       // e.g., "1.0.0"
//     },

//     buildNumber: {
//       type: String,
//       // e.g., "123"
//     },

//     // DEVICE STATUS (for tracking)
//     isActive: {
//       type: Boolean,
//       default: true,
//       // Set to false if user logs out from this device
//     },

//     // TIMESTAMPS
//     firstLogin: {
//       type: Date,
//       default: Date.now,
//       // When this device was first registered
//     },

//     lastActive: {
//       type: Date,
//       default: Date.now,
//       // Last time user opened app on this device
//     },

//     // SECURITY
//     lastLoginIP: {
//       type: String,
//       // Track IP address for security
//     },

//     // OPTIONAL: Device Token for Push Notifications
//     pushToken: {
//       type: String,
//       sparse: true, // Can be null, but unique if present
//     },

//     // METADATA
//     deviceMetadata: {
//       manufacturer: String, // e.g., "Apple Inc."
//       fingerprint: String, // Android build fingerprint
//       apiLevel: Number, // Android API level
//       carrier: String, // Mobile carrier
//       hasNotch: Boolean,
//       isTablet: Boolean,
//       isEmulator: Boolean,
//     },
//   },
//   { timestamps: true },
// ); // createdAt, updatedAt

// // COMPOUND INDEX: userId + deviceUniqueId for fast lookups
// deviceSchema.index({ userId: 1, deviceUniqueId: 1 });

// // INSTANCE METHODS

// // Update last active timestamp
// deviceSchema.methods.updateLastActive = async function () {
//   this.lastActive = new Date();
//   return await this.save();
// };

// // Deactivate device (logout)
// deviceSchema.methods.deactivate = async function () {
//   this.isActive = false;
//   return await this.save();
// };

// // STATIC METHODS

// // Find or create device
// deviceSchema.statics.findOrCreate = async function (userId, deviceInfo) {
//   let device = await this.findOne({
//     deviceUniqueId: deviceInfo.deviceUniqueId,
//   });

//   if (device) {
//     // Device exists - update last active and return
//     device.lastActive = new Date();
//     device.isActive = true;

//     // Update app version if changed
//     if (device.appVersion !== deviceInfo.appVersion) {
//       device.appVersion = deviceInfo.appVersion;
//     }

//     await device.save();
//     console.log("✅ Existing device found and updated");
//     return { device, isNew: false };
//   }

//   // Create new device
//   device = await this.create({
//     userId,
//     ...deviceInfo,
//   });

//   console.log("✅ New device registered");
//   return { device, isNew: true };
// };

// // Get all devices for a user
// deviceSchema.statics.getByUserId = async function (userId) {
//   return await this.find({ userId }).sort({ lastActive: -1 });
// };

// // Get active devices for a user
// deviceSchema.statics.getActiveDevices = async function (userId) {
//   return await this.find({
//     userId,
//     isActive: true,
//   }).sort({ lastActive: -1 });
// };

// export const Device = mongoose.model("Device", deviceSchema);
