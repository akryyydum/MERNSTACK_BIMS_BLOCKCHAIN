const User = require("../models/user.model");
const Resident = require("../models/resident.model");
const bcrypt = require("bcryptjs");

// GET /api/admin/users
exports.list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const { search, role } = req.query;
    const q = {};
    if (role) q.role = role;
    if (search) {
      const s = String(search).trim();
      q.$or = [
        { username: new RegExp(s, "i") },
        { fullName: new RegExp(s, "i") },
        { "contact.email": new RegExp(s, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(q)
        .select("-passwordHash -verificationToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(q),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users
exports.create = async (req, res) => {
  try {
    const { username, password, fullName, contact = {}, role } = req.body;

    // Disallow admin creation of resident accounts
    if (role === "resident") {
      return res.status(400).json({ message: "Resident accounts can only be created via self-registration" });
    }

    if (!username || !password || !fullName || !contact.email || !contact.mobile || !role) {
      return res.status(400).json({ message: "username, password, fullName, contact.email, contact.mobile, role are required" });
    }
    if (!["admin", "official"].includes(role)) {
      return res.status(400).json({ message: "Only admin or official can be created here" });
    }

    const exists = await User.findOne({
      $or: [{ username }, { "contact.email": String(contact.email).toLowerCase().trim() }],
    });
    if (exists) return res.status(400).json({ message: "Username or email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role,
      fullName,
      contact: { email: String(contact.email).toLowerCase().trim(), mobile: contact.mobile },
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
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, isVerified, fullName, contact } = req.body;

    const update = {};
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof isVerified === "boolean") update.isVerified = isVerified;
    if (fullName) update.fullName = String(fullName).trim();
    if (role) {
      if (!["admin", "official", "resident"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      update.role = role;
    }
    if (contact) {
      if (contact.email !== undefined) update["contact.email"] = String(contact.email).toLowerCase().trim();
      if (contact.mobile !== undefined) update["contact.mobile"] = contact.mobile;
      // ensure unique email if changed
      if (contact.email) {
        const exists = await User.findOne({
          _id: { $ne: id },
          "contact.email": String(contact.email).toLowerCase().trim(),
        });
        if (exists) return res.status(400).json({ message: "Email already in use" });
      }
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await User.updateOne({ _id: id }, { $set: update });
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    // optional: prevent self-delete
    if (req.user && String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    await User.deleteOne({ _id: id });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};