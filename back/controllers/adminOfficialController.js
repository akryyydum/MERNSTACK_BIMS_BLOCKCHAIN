const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

// List all officials (return array, not {items: []})
exports.list = async (req, res) => {
  try {
    const officials = await User.find({ role: "official" })
      .select("-passwordHash -verificationToken")
      .sort({ createdAt: -1 })
      .lean();
    res.json(officials);
  } catch (err) {
    console.error("[adminOfficialController.list]", err);
    res.status(500).json({ message: err.message });
  }
};

// Create a new official (accept flat fields, like resident controller)
exports.create = async (req, res) => {
  try {
    const { username, password, fullName, email, mobile } = req.body;
    if (!username || !password || !fullName || !email || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const exists = await User.findOne({
      $or: [
        { username },
        { "contact.email": String(email).toLowerCase().trim() },
      ],
    });
    if (exists) return res.status(400).json({ message: "Username or email already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role: "official",
      fullName,
      contact: {
        email: String(email).toLowerCase().trim(),
        mobile,
      },
      isVerified: true,
      isActive: true,
    });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      contact: user.contact,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("[adminOfficialController.create]", err);
    res.status(500).json({ message: err.message });
  }
};

// Update official (accept flat fields, like resident controller)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, isActive } = req.body;
    const update = {};
    if (fullName) update.fullName = String(fullName).trim();
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (email !== undefined) update["contact.email"] = String(email).toLowerCase().trim();
    if (mobile !== undefined) update["contact.mobile"] = mobile;
    if (email) {
      const exists = await User.findOne({
        _id: { $ne: id },
        "contact.email": String(email).toLowerCase().trim(),
      });
      if (exists) return res.status(400).json({ message: "Email already in use" });
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return res.status(404).json({ message: "Official not found" });
    res.json({ message: "Official updated", user });
  } catch (err) {
    console.error("[adminOfficialController.update]", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete official
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "Official not found" });
    res.json({ message: "Official deleted" });
  } catch (err) {
    console.error("[adminOfficialController.remove]", err);
    res.status(500).json({ message: err.message });
  }
};
