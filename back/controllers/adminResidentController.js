const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Resident = require("../models/resident.model");
const multer = require("multer");
const XLSX = require("xlsx");

const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};
const DEFAULT_CITIZENSHIP = "Filipino";
const ALLOWED_STATUSES = new Set(["verified", "pending", "rejected"]);

// =============================
// 🟢 CREATE RESIDENT
// =============================
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
      idFiles,
      status,
    } = req.body;

    const contactData = contact && typeof contact === "object" ? contact : {};
    const normalizedEmail =
      typeof contactData.email === "string" && contactData.email.trim()
        ? contactData.email.toLowerCase().trim()
        : undefined;

    const rawAddress = address && typeof address === "object" ? address : {};
    const normalizedAddress = {
      ...ADDRESS_DEFAULTS,
      ...rawAddress,
      purok:
        typeof rawAddress.purok === "string" ? rawAddress.purok.trim() : rawAddress.purok,
    };

    const dob =
      typeof dateOfBirth === "string" || typeof dateOfBirth === "number"
        ? new Date(dateOfBirth)
        : dateOfBirth instanceof Date
        ? dateOfBirth
        : null;

    if (!dob || Number.isNaN(dob.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const sanitized = {
      firstName: typeof firstName === "string" ? firstName.trim() : firstName,
      middleName: typeof middleName === "string" ? middleName.trim() : middleName,
      lastName: typeof lastName === "string" ? lastName.trim() : lastName,
      suffix: typeof suffix === "string" ? suffix.trim() : suffix,
      birthPlace: typeof birthPlace === "string" ? birthPlace.trim() : birthPlace,
      sex: typeof sex === "string" ? sex.trim().toLowerCase() : sex,
      civilStatus:
        typeof civilStatus === "string" ? civilStatus.trim().toLowerCase() : civilStatus,
      religion: typeof religion === "string" ? religion.trim() : religion,
      ethnicity: typeof ethnicity === "string" ? ethnicity.trim() : ethnicity,
      citizenship:
        typeof citizenship === "string" && citizenship.trim()
          ? citizenship.trim()
          : DEFAULT_CITIZENSHIP,
      occupation: typeof occupation === "string" ? occupation.trim() : occupation,
      sectoralInformation:
        typeof sectoralInformation === "string" ? sectoralInformation.trim() : sectoralInformation,
      employmentStatus:
        typeof employmentStatus === "string" ? employmentStatus.trim() : employmentStatus,
    };

    const requiredMissing =
      !sanitized.firstName ||
      !sanitized.lastName ||
      !dob ||
      !sanitized.birthPlace ||
      !sanitized.sex ||
      !sanitized.civilStatus ||
      !sanitized.ethnicity ||
      !normalizedAddress?.purok ||
      !normalizedAddress?.barangay ||
      !normalizedAddress?.municipality ||
      !normalizedAddress?.province ||
      !sanitized.citizenship ||
      !sanitized.occupation;

    if (requiredMissing) {
      return res.status(400).json({ message: "Missing required resident fields" });
    }

    const sanitizedContact = {};
    if (normalizedEmail) sanitizedContact.email = normalizedEmail;
    if (typeof contactData.mobile === "string" && contactData.mobile.trim()) {
      sanitizedContact.mobile = contactData.mobile.trim();
    }

    const statusValue =
      typeof status === "string" ? status.trim().toLowerCase() : undefined;
    const resolvedStatus = ALLOWED_STATUSES.has(statusValue)
      ? statusValue
      : "verified";

    const resident = await Resident.create({
      firstName: sanitized.firstName,
      middleName: sanitized.middleName,
      lastName: sanitized.lastName,
      suffix: sanitized.suffix,
      dateOfBirth: dob,
      birthPlace: sanitized.birthPlace,
      sex: sanitized.sex,
      civilStatus: sanitized.civilStatus,
      religion: sanitized.religion,
      ethnicity: sanitized.ethnicity,
      address: normalizedAddress,
      citizenship: sanitized.citizenship,
      occupation: sanitized.occupation,
      sectoralInformation: sanitized.sectoralInformation,
      employmentStatus: sanitized.employmentStatus,
      registeredVoter: typeof registeredVoter === "boolean" ? registeredVoter : false,
      contact: sanitizedContact,
      idFiles,
      status: resolvedStatus,
    });

    res.status(201).json({ message: "Resident created", resident });
  } catch (err) {
    console.error("Resident creation error:", err);
    const statusCode = err.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({
      message: err.message || "Internal server error",
      error: err.name === "ValidationError" ? err.errors : undefined,
    });
  }
};

// =============================
// 🟢 LIST RESIDENTS
// =============================
exports.list = async (req, res) => {
  try {
    const residents = await Resident.find({}).populate("user", "username fullName contact");
    res.json(residents);
  } catch (err) {
    console.error("Error in residents list:", err);
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 🟢 UPDATE RESIDENT
// =============================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    if (update.dateOfBirth && typeof update.dateOfBirth === "string") {
      update.dateOfBirth = new Date(update.dateOfBirth);
    }
    const resident = await Resident.findByIdAndUpdate(id, update, { new: true });
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    res.json({ message: "Resident updated", resident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 🟢 DELETE RESIDENT
// =============================
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const resident = await Resident.findByIdAndDelete(id);
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    await User.findByIdAndDelete(resident.user);
    res.json({ message: "Resident deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 🟢 VERIFY RESIDENT
// =============================
exports.verify = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const resident = await Resident.findByIdAndUpdate(
      id,
      { status: status || "verified" },
      { new: true }
    );
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    res.json({ message: "Resident status updated", resident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 📥 IMPORT RESIDENTS (Excel/CSV)
// =============================
const upload = multer({ dest: "uploads/" });
exports.importResidentsMiddleware = upload.single("file");

exports.importResidents = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    // Get purok from request body
    const importPurok = req.body.purok;
    if (!importPurok) {
      return res.status(400).json({ message: "Purok is required for import" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length)
      return res.status(400).json({ message: "No data found in file" });

    const inserted = [];
    const skipped = [];

    for (const row of rows) {
      // 🧩 Extract only what’s needed
      const residentData = {
        firstName: row["FIRST NAME"]?.trim(),
        middleName: row["MIDDLE NAME"]?.trim(),
        lastName: row["LAST NAME"]?.trim(),
        suffix: row["SUFFIX"]?.trim() || "",
        birthPlace: row["BIRTH PLACE"]?.trim() || "Bayombong",
        dateOfBirth: new Date(row["BIRTHDATE (YYYY-MM-DD)"]),
        sex: (row["SEX"] || "").toLowerCase(),
        civilStatus: (row["CIVIL STATUS"] || "").toLowerCase(),
        citizenship: row["CITIZENSHIP"]?.trim() || "Filipino",
        occupation: row["PROFESSION/ OCCUPATION"]?.trim() || "Unemployed",
        sectoralInformation: (() => {
          const secInfo = row["SEC. INFO"]?.trim() || "";
          const secInfoLower = secInfo.toLowerCase();
          const isLaborForce = secInfoLower.includes("labor") && secInfoLower.includes("force");
          const isUnemployed = secInfoLower === "unemployed";
          if (isLaborForce || isUnemployed) return "None";
          return secInfo || "None";
        })(),
        employmentStatus: (() => {
          const secInfo = row["SEC. INFO"]?.trim() || "";
          const secInfoLower = secInfo.toLowerCase();
          const isLaborForce = secInfoLower.includes("labor") && secInfoLower.includes("force");
          const isUnemployed = secInfoLower === "unemployed";
          if (isLaborForce) return "Labor Force";
          if (isUnemployed) return "Unemployed";
          return undefined;
        })(),
        registeredVoter:
          (row["VOTER"] || "").toString().toLowerCase() === "yes",
        address: {
          purok: importPurok, // Use the selected purok from the import form
          barangay: "La Torre North",
          municipality: "Bayombong",
          province: "Nueva Vizcaya",
          zipCode: "3700",
        },
        ethnicity: "Ilocano", // optional default
        religion: "",
        contact: {}, // No contact info in file
        status: "pending",
      };

      // Validate required fields
      if (
        !residentData.firstName ||
        !residentData.lastName ||
        !residentData.dateOfBirth ||
        Number.isNaN(residentData.dateOfBirth.getTime())
      ) {
        skipped.push(row);
        continue;
      }

      // Prevent duplicates (same full name + birthdate)
      const duplicate = await Resident.findOne({
        firstName: residentData.firstName,
        lastName: residentData.lastName,
        dateOfBirth: residentData.dateOfBirth,
      });
      if (duplicate) {
        skipped.push(row);
        continue;
      }

      await Resident.create(residentData);
      inserted.push(residentData);
    }

    res.json({
      message: `✅ Import complete: ${inserted.length} added to ${importPurok}, ${skipped.length} skipped.`,
      inserted: inserted.length,
      skipped: skipped.length,
      purok: importPurok,
    });
  } catch (err) {
    console.error("Import residents error:", err);
    res
      .status(500)
      .json({ message: "Failed to import residents", error: err.message });
  }
};

