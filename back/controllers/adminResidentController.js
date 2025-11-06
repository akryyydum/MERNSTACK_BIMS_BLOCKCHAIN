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

// POST /api/admin/residents
exports.create = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      gender,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      sectoralInformation,
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
      gender: typeof gender === "string" ? gender.trim().toLowerCase() : gender,
      civilStatus:
        typeof civilStatus === "string" ? civilStatus.trim().toLowerCase() : civilStatus,
      religion: typeof religion === "string" ? religion.trim() : religion,
      ethnicity: typeof ethnicity === "string" ? ethnicity.trim() : ethnicity,
      citizenship:
        typeof citizenship === "string" && citizenship.trim()
          ? citizenship.trim()
          : DEFAULT_CITIZENSHIP,
      occupation: typeof occupation === "string" ? occupation.trim() : occupation,
      sectoralInformation: typeof sectoralInformation === "string" ? sectoralInformation.trim() : sectoralInformation,
    };

    const requiredMissing =
      !sanitized.firstName ||
      !sanitized.lastName ||
      !dob ||
      !sanitized.birthPlace ||
      !sanitized.gender ||
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
      gender: sanitized.gender,
      civilStatus: sanitized.civilStatus,
      religion: sanitized.religion,
      ethnicity: sanitized.ethnicity,
      address: normalizedAddress,
      citizenship: sanitized.citizenship,
      occupation: sanitized.occupation,
      sectoralInformation: sanitized.sectoralInformation,
      registeredVoter: typeof registeredVoter === 'boolean' ? registeredVoter : false,
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

// GET /api/admin/residents
exports.list = async (req, res) => {
  try {
    console.log("Admin residents list request:", {
      user: req.user,
      query: req.query,
      headers: {
        authorization: req.headers.authorization ? "Present" : "Missing"
      }
    });
    
    const filter = {};
    if (String(req.query.unlinked) === "true") {
      // Get all residents
      const allResidents = await Resident.find({});
      const unlinkedResidents = [];
      
      // Check each resident to see if they're truly unlinked
      for (const resident of allResidents) {
        if (!resident.user) {
          // No user reference at all
          unlinkedResidents.push(resident);
        } else {
          // Check if the referenced user actually exists
          const User = require("../models/user.model");
          const userExists = await User.findById(resident.user);
          if (!userExists) {
            // Broken reference - clean it up and include in unlinked list
            await Resident.updateOne(
              { _id: resident._id },
              { $unset: { user: 1 } }
            );
            resident.user = undefined; // Update local object
            unlinkedResidents.push(resident);
          }
        }
      }
      
      console.log(`Found ${unlinkedResidents.length} unlinked residents`);
      return res.json(unlinkedResidents);
    }
    
    const residents = await Resident.find(filter).populate("user", "username fullName contact");
    
    console.log(`Found ${residents.length} residents`);
    res.json(residents);
  } catch (err) {
    console.error("Error in residents list:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/residents/:id
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

// DELETE /api/admin/residents/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const resident = await Resident.findByIdAndDelete(id);
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    // Optionally delete the linked user:
    await User.findByIdAndDelete(resident.user);
    res.json({ message: "Resident deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/residents/:id/verify
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
  return [`Purok ${n}`, "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5"].includes(`Purok ${n}`)
    ? `Purok ${n}`
    : undefined;
};
const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  // Handle Excel serials
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

// Bulk Import from Excel
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      // normalize headers to lower-case
      const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [String(k).trim().toLowerCase(), v])
      );

      // Support both your Export headers and canonical names
      const fullName = (row["full name"] || "").toString().trim();
      let firstName =
        row["first name"] || row["firstname"] || (fullName ? fullName.split(" ")[0] : "");
      let lastName =
        row["last name"] || row["lastname"] || (fullName ? fullName.split(" ").slice(-1)[0] : "");
      const middleName = row["middle name"] || row["middlename"] || "";
      const suffix = row["suffix"] || "";

      const gender = enumOr(
        (row["gender"] || "").toString().toLowerCase(),
        ["male", "female", "other"],
        undefined
      );

      const dateOfBirth =
        row["date of birth"] || row["dob"] || row["birthdate"] || row["birth date"];
      const dob = parseDate(dateOfBirth);

      const birthPlace = row["birth place"] || row["birthplace"] || "";
      const civilStatus = enumOr(
        (row["civil status"] || row["civilstatus"] || "").toString().toLowerCase(),
        ["single", "married", "widowed", "separated"],
        undefined
      );
      const religion = row["religion"] || "";
      const ethnicity = row["ethnicity"] || "";

      const purok = normPurok(row["purok"]);
      const barangay = row["barangay"] || ADDRESS_DEFAULTS.barangay;
      const municipality = row["municipality"] || ADDRESS_DEFAULTS.municipality;
      const province = row["province"] || ADDRESS_DEFAULTS.province;
      const zipCode = row["zip code"] || row["zipcode"] || ADDRESS_DEFAULTS.zipCode;

      const citizenship = row["citizenship"] || DEFAULT_CITIZENSHIP;
      const occupation = row["occupation"] || "";

      const sectoralRaw = row["sectoral information"] || row["sectoral"] || "";
      const sectoralInformation = enumOr(
        sectoralRaw,
        [
          "Solo Parent",
          "OFW",
          "PWD",
          "Unemployed",
          "Labor Force",
          "OSC - Out of School Children",
          "OSC - Out of School Youth",
          "OSC - Out of School Adult",
          "None",
        ],
        "None"
      );

      const registeredVoter = toBool(row["registered voter"] || row["registeredvoter"]);
      const mobile = row["mobile"] || row["mobile number"] || row["phone"] || "";
      const email = (row["email"] || "").toString().trim().toLowerCase();

      const statusRaw = (row["status"] || "").toString().toLowerCase();
      const status = ["verified", "pending", "rejected"].includes(statusRaw)
        ? statusRaw
        : undefined;

      // Validate required fields
      const missing =
        !firstName ||
        !lastName ||
        !dob ||
        !birthPlace ||
        !gender ||
        !civilStatus ||
        !ethnicity ||
        !purok ||
        !barangay ||
        !municipality ||
        !province ||
        !citizenship ||
        !occupation;

      if (missing) {
        results.skipped++;
        results.errors.push({ row: i + 2, message: "Missing required fields" }); // +2 accounts for header + 1-index
        continue;
      }

      const doc = {
        firstName: String(firstName).trim(),
        middleName: String(middleName || "").trim() || undefined,
        lastName: String(lastName).trim(),
        suffix: String(suffix || "").trim() || undefined,
        dateOfBirth: dob,
        birthPlace: String(birthPlace).trim(),
        gender,
        civilStatus,
        religion: religion ? String(religion).trim() : undefined,
        ethnicity: String(ethnicity).trim(),
        address: {
          purok,
          barangay: String(barangay).trim(),
          municipality: String(municipality).trim(),
          province: String(province).trim(),
          zipCode: zipCode ? String(zipCode).trim() : undefined,
        },
        citizenship: String(citizenship).trim(),
        occupation: String(occupation).trim(),
        sectoralInformation,
        registeredVoter,
        contact: {
          ...(mobile ? { mobile: String(mobile).trim() } : {}),
          ...(email ? { email } : {}),
        },
        ...(status ? { status } : {}),
      };

      // Upsert by name + dob + birthplace (adjust if you prefer another key)
      const existing = await Resident.findOne({
        firstName: doc.firstName,
        lastName: doc.lastName,
        dateOfBirth: doc.dateOfBirth,
        birthPlace: doc.birthPlace,
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
      message: `✅ Import complete: ${inserted.length} added, ${skipped.length} skipped.`,
      inserted: inserted.length,
      skipped: skipped.length,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({ message: err.message || "Import failed" });
  }
};

exports.importResidents = exports.bulkImport;

// Optional: placeholder if you plan to add file upload middleware later
exports.importResidentsMiddleware = (req, res, next) => next();
