const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Resident = require("../models/resident.model");
const XLSX = require("xlsx");

const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};
const DEFAULT_CITIZENSHIP = "Filipino";
const ALLOWED_STATUSES = new Set(["verified", "pending", "rejected"]);

// ==================== CRUD OPERATIONS ====================

// GET /api/admin/residents - List all residents
exports.list = async (req, res) => {
  try {
    const residents = await Resident.find().sort({ createdAt: -1 });
    res.json(residents);
  } catch (err) {
    console.error("List residents error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch residents" });
  }
};

// POST /api/admin/residents - Create new resident
exports.create = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      sex,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      sectoralInformation,
      employmentStatus,
      registeredVoter,
      contact = {},
      status,
    } = req.body;

    const normalizedAddress = {
      ...ADDRESS_DEFAULTS,
      ...(address || {}),
    };

    const resident = await Resident.create({
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      sex,
      civilStatus,
      religion,
      ethnicity,
      address: normalizedAddress,
      citizenship: citizenship || DEFAULT_CITIZENSHIP,
      occupation,
      sectoralInformation,
      employmentStatus,
      registeredVoter: registeredVoter || false,
      contact,
      status: status || "pending",
    });

    res.status(201).json(resident);
  } catch (err) {
    console.error("Create resident error:", err);
    res.status(400).json({ message: err.message || "Failed to create resident" });
  }
};

// PATCH /api/admin/residents/:id - Update resident
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const resident = await Resident.findByIdAndUpdate(
      id,
      { $set: updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!resident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    res.json(resident);
  } catch (err) {
    console.error("Update resident error:", err);
    res.status(400).json({ message: err.message || "Failed to update resident" });
  }
};

// DELETE /api/admin/residents/:id - Delete resident
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const resident = await Resident.findByIdAndDelete(id);

    if (!resident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    res.json({ message: "Resident deleted successfully" });
  } catch (err) {
    console.error("Delete resident error:", err);
    res.status(500).json({ message: err.message || "Failed to delete resident" });
  }
};

// PATCH /api/admin/residents/:id/verify - Verify/reject resident
exports.verify = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const resident = await Resident.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );

    if (!resident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    res.json(resident);
  } catch (err) {
    console.error("Verify resident error:", err);
    res.status(500).json({ message: err.message || "Failed to verify resident" });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Helpers
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return ["yes", "true", "1", "y"].includes(s);
};
const normPurok = (v) => {
  if (!v && v !== 0) return undefined;
  const s = String(v).trim();
  const m = s.match(/(\d+)/);
  if (!m) return undefined;
  const n = m[1];
  return `Purok ${n}`;
};
const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  const d = new Date(String(v));
  return isNaN(d) ? null : d;
};
const enumOr = (value, allowed, fallback) => {
  const v = typeof value === "string" ? value.trim() : value;
  return allowed.includes(v) ? v : fallback;
};

// 📥 Bulk Excel Import (multi-sheet, uppercase headers)
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });

    // Combine all sheets into one array
    const allRows = wb.SheetNames.flatMap(sheetName => {
      const ws = wb.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(ws, { defval: "" });
    });

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < allRows.length; i++) {
      const raw = allRows[i];
      const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [String(k).trim().toUpperCase(), v])
      );

      // Extract fields from uppercase columns
      const firstName = row["FIRST NAME"] || "";
      const lastName = row["LAST NAME"] || "";
      const middleName = row["MIDDLE NAME"] || "";
      const suffix = row["SUFFIX"] || "";
      const birthPlace = row["BIRTH PLACE"] || "Bayombong";
      const dateOfBirth = parseDate(row["BIRTHDATE (YYYY-MM-DD)"]);
      const gender = enumOr(
        (row["SEX"] || "").toString().toLowerCase(),
        ["male", "female"],
        undefined
      );
      const civilStatus = enumOr(
        (row["CIVIL STATUS"] || "").toString().toLowerCase(),
        ["single", "married", "widowed", "separated"],
        "single"
      );
      const citizenship = row["CITIZENSHIP"] || DEFAULT_CITIZENSHIP;
      const occupation =
        row["PROFESSION/ OCCUPATION"] ||
        row["OCCUPATION"] ||
        "Unemployed";
      const ethnicity = row["ETHNICITY"] || row["ETHNIC GROUP"] || "Not Specified";
      const religion = row["RELIGION"] || "";
      
      // Normalize sectoral information to match enum values
      const rawSectoral = 
        row["SEC. INFO"] ||
        row["SEC INFO"] ||
        row["SECTORAL INFORMATION"] ||
        "";
      const sectoralInformation = enumOr(
        String(rawSectoral).trim(),
        ['Solo Parent', 'OFW', 'PWD', 'OSC - Out of School Children', 'OSC - Out of School Youth', 'OSC - Out of School Adult', 'None'],
        'None'
      );
      
      const registeredVoter = toBool(row["VOTER"]);
      const purok = normPurok(row["PUROK"]) || req.body.purok || "Purok 1";

      // Validation check
      const missing =
        !firstName || !lastName || !dateOfBirth || !gender || !civilStatus || !occupation || !ethnicity;

      if (missing) {
        results.skipped++;
        results.errors.push({
          row: i + 2,
          message: `Missing required fields. Row data: ${JSON.stringify({ firstName, lastName, dateOfBirth, gender, civilStatus, occupation, ethnicity })}`,
        });
        continue;
      }

      const doc = {
        firstName: String(firstName).trim(),
        middleName: String(middleName).trim() || undefined,
        lastName: String(lastName).trim(),
        suffix: String(suffix).trim() || undefined,
        dateOfBirth,
        birthPlace: String(birthPlace).trim(),
        sex: gender,
        civilStatus,
        citizenship: String(citizenship).trim(),
        occupation: String(occupation).trim(),
        sectoralInformation,
        registeredVoter,
        address: {
          purok: purok || "Unspecified",
          barangay: ADDRESS_DEFAULTS.barangay,
          municipality: ADDRESS_DEFAULTS.municipality,
          province: ADDRESS_DEFAULTS.province,
          zipCode: ADDRESS_DEFAULTS.zipCode,
        },
        religion: String(religion).trim(),
        ethnicity: String(ethnicity).trim(),
        contact: {},
        status: "verified",
      };

      // Upsert (check existing record by name + DOB)
      const existing = await Resident.findOne({
        firstName: doc.firstName,
        lastName: doc.lastName,
        dateOfBirth: doc.dateOfBirth,
      });

      if (existing) {
        await Resident.updateOne({ _id: existing._id }, { $set: doc });
        results.updated++;
      } else {
        await Resident.create(doc);
        results.created++;
      }
    }

    res.json({
      message: `✅ Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
      results,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({ message: err.message || "Import failed" });
  }
};
