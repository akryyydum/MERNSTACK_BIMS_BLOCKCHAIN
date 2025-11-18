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
      sex,
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

    // Accept both 'sex' and 'gender' field names for compatibility
    const sexValue = sex || gender;
    
    const sanitized = {
      firstName: typeof firstName === "string" ? firstName.trim() : firstName,
      middleName: typeof middleName === "string" ? middleName.trim() : middleName,
      lastName: typeof lastName === "string" ? lastName.trim() : lastName,
      suffix: typeof suffix === "string" ? suffix.trim() : suffix,
      birthPlace: typeof birthPlace === "string" ? birthPlace.trim() : birthPlace,
      sex: typeof sexValue === "string" ? sexValue.trim().toLowerCase() : sexValue,
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
      !sanitized.sex ||
      !sanitized.civilStatus ||
      !normalizedAddress?.purok ||
      !normalizedAddress?.barangay ||
      !normalizedAddress?.municipality ||
      !normalizedAddress?.province ||
      !sanitized.citizenship ||
      !sanitized.occupation;

    if (requiredMissing) {
      return res.status(400).json({ message: "Missing required resident fields" });
    }

    // Validate uniqueness of email and mobile
    if (normalizedEmail) {
      const existingEmail = await Resident.findOne({ 'contact.email': normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ message: "Email is already registered to another resident" });
      }
    }

    if (contactData.mobile && contactData.mobile.trim()) {
      const normalizedMobile = contactData.mobile.trim();
      const existingMobile = await Resident.findOne({ 'contact.mobile': normalizedMobile });
      if (existingMobile) {
        return res.status(400).json({ message: "Mobile number is already registered to another resident" });
      }
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
    
    // Get the current resident to check if email/mobile is changing
    const currentResident = await Resident.findById(id);
    if (!currentResident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    // Validate email uniqueness if being updated
    if (update.contact && update.contact.email) {
      const normalizedEmail = update.contact.email.toLowerCase().trim();
      if (normalizedEmail !== currentResident.contact?.email) {
        const existingEmail = await Resident.findOne({ 
          'contact.email': normalizedEmail,
          _id: { $ne: id }
        });
        if (existingEmail) {
          return res.status(400).json({ message: "Email is already registered to another resident" });
        }
      }
    }

    // Validate mobile uniqueness if being updated
    if (update.contact && update.contact.mobile) {
      const normalizedMobile = update.contact.mobile.trim();
      if (normalizedMobile !== currentResident.contact?.mobile) {
        const existingMobile = await Resident.findOne({ 
          'contact.mobile': normalizedMobile,
          _id: { $ne: id }
        });
        if (existingMobile) {
          return res.status(400).json({ message: "Mobile number is already registered to another resident" });
        }
      }
    }

    if (update.dateOfBirth && typeof update.dateOfBirth === "string") {
      update.dateOfBirth = new Date(update.dateOfBirth);
    }
    
    const resident = await Resident.findByIdAndUpdate(id, update, { new: true });
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
    
    // Get purok from form selection (required)
    const selectedPurok = normPurok(req.body.purok);
    if (!selectedPurok) {
      return res.status(400).json({ message: "Purok selection is required" });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const results = { 
      created: 0, 
      updated: 0, 
      skipped: 0, 
      errors: [],
      householdsCreated: 0,
      householdsUpdated: 0
    };
    
    // Import Household model
    const Household = require("../models/household.model");
    
    // Track households by NO. column
    const householdsByNo = new Map();
    const residentsByRow = new Map();

    // First pass: Create/update all residents
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
      const suffix = row["suffix"] || row["ext"] || "";

      const sex = enumOr(
        (row["sex"] || row["gender"] || "").toString().toLowerCase(),
        ["male", "female", "other"],
        undefined
      );

      const dateOfBirth =
        row["birthdate (yyyy-mm-dd)"] || row["birthdate"] || row["date of birth"] || row["dob"] || row["birth date"];
      const dob = parseDate(dateOfBirth);

      const birthPlace = row["birth place"] || row["birthplace"] || "";
      const civilStatus = enumOr(
        (row["civil status"] || row["civilstatus"] || "").toString().toLowerCase(),
        ["single", "married", "widowed", "separated"],
        undefined
      );
      const religion = row["religion"] || "";
      const ethnicity = row["ethnicity"] || ""; // No default - leave blank if not in file

      // Use the selected purok from the form
      const purok = selectedPurok;
      const barangay = row["barangay"] || ADDRESS_DEFAULTS.barangay;
      const municipality = row["municipality"] || ADDRESS_DEFAULTS.municipality;
      const province = row["province"] || ADDRESS_DEFAULTS.province;
      const zipCode = row["zip code"] || row["zipcode"] || ADDRESS_DEFAULTS.zipCode;

      const citizenship = row["citizenship"] || DEFAULT_CITIZENSHIP;
      const occupation = row["profession/ occupation"] || row["occupation"] || "N/A"; // Default occupation if not provided

      // Collect all SEC. INFO values from all columns (there might be multiple columns)
      const sectoralValues = [];
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase();
        // Match any column that contains "sec" (for SEC. INFO columns)
        if (lowerKey.includes("sec")) {
          const val = String(row[key]).trim();
          console.log(`Found sectoral column: "${key}" = "${val}"`);
          if (val && val !== "" && val !== "None") {
            sectoralValues.push(val);
          }
        }
      });
      
      console.log(`Row ${i + 2}: Sectoral values found:`, sectoralValues);
      
      // Separate employment status from sectoral information
      let employmentStatus = undefined;
      let sectoralInformation = undefined;
      
      // Process each sectoral value
      for (const val of sectoralValues) {
        const lowerVal = val.toLowerCase();
        
        if (lowerVal === "labor force" || lowerVal === "unemployed") {
          // This is an employment status
          employmentStatus = lowerVal === "labor force" ? "Labor Force" : "Unemployed";
          console.log(`  -> Employment status: ${employmentStatus}`);
        } else {
          // This is sectoral information - normalize the value for matching
          let normalizedVal = val;
          
          // Convert common variations to proper enum values
          if (lowerVal === "solo parent") normalizedVal = "Solo Parent";
          else if (lowerVal === "ofw" || lowerVal.includes("overseas filipino worker")) normalizedVal = "OFW (Overseas Filipino Worker)";
          else if (lowerVal === "pwd" || lowerVal.includes("person with disability")) normalizedVal = "PWD (Person with Disability)";
          else if (lowerVal.includes("out of school")) {
            if (lowerVal.includes("children") || lowerVal === "osc") normalizedVal = "OSC (Out of School Children)";
            else if (lowerVal.includes("youth") || lowerVal === "osy") normalizedVal = "OSY (Out of School Youth)";
            else if (lowerVal.includes("adult") || lowerVal === "osa") normalizedVal = "OSA (Out of School Adult)";
          }
          
          const mapped = enumOr(
            normalizedVal,
            [
              "Solo Parent",
              "OFW (Overseas Filipino Worker)",
              "PWD (Person with Disability)",
              "OSC (Out of School Children)",
              "OSY (Out of School Youth)",
              "OSA (Out of School Adult)",
            ],
            undefined
          );
          console.log(`  -> Trying to map "${val}" (normalized: "${normalizedVal}") to sectoral info: ${mapped}`);
          if (mapped) {
            sectoralInformation = mapped;
          }
        }
      }
      
      // Set default to None if nothing was found
      if (!sectoralInformation) {
        sectoralInformation = "None";
      }
      
      console.log(`Row ${i + 2}: Final - Employment: ${employmentStatus}, Sectoral: ${sectoralInformation}`);

      const registeredVoter = toBool(row["voter"] || row["registered voter"] || row["registeredvoter"]);
      const mobile = row["mobile"] || row["mobile number"] || row["phone"] || "";
      const email = (row["email"] || "").toString().trim().toLowerCase();

      const statusRaw = (row["status"] || "").toString().toLowerCase();
      const status = ["verified", "pending", "rejected"].includes(statusRaw)
        ? statusRaw
        : undefined;

      // Validate required fields (ethnicity and citizenship have defaults)
      const missing = [];
      if (!firstName) missing.push("firstName");
      if (!lastName) missing.push("lastName");
      if (!dob) missing.push("dateOfBirth");
      if (!birthPlace) missing.push("birthPlace");
      if (!sex) missing.push("sex");
      if (!civilStatus) missing.push("civilStatus");

      if (missing.length > 0) {
        results.skipped++;
        results.errors.push({ 
          row: i + 2, 
          message: `Missing required fields: ${missing.join(", ")}` 
        });
        continue;
      }

      const doc = {
        firstName: String(firstName).trim(),
        middleName: String(middleName || "").trim() || undefined,
        lastName: String(lastName).trim(),
        suffix: String(suffix || "").trim() || undefined,
        dateOfBirth: dob,
        birthPlace: String(birthPlace).trim(),
        sex,
        civilStatus,
        religion: religion ? String(religion).trim() : undefined,
        ethnicity: ethnicity ? String(ethnicity).trim() : undefined,
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
        employmentStatus,
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

      let residentId;
      if (existing) {
        await Resident.updateOne({ _id: existing._id }, { $set: doc });
        results.updated++;
        residentId = existing._id;
      } else {
        const newResident = await Resident.create(doc);
        results.created++;
        residentId = newResident._id;
      }
      
      // Store resident info for household creation
      const householdNo = row["no."] || row["no"] || row["household no"] || "";
      const role = (row["role"] || "").toString().trim().toUpperCase();
      
      console.log(`Row ${i + 2}: Resident ${firstName} ${lastName} - Household No: "${householdNo}", Role: "${role}"`);
      
      // Track residents with their role for smart household grouping
      residentsByRow.set(i, {
        residentId,
        householdNo: householdNo ? String(householdNo).trim() : null,
        role,
        address: doc.address,
        firstName,
        lastName
      });
    }
    
    // Smart household grouping: 
    // Check if household numbers are actually used for grouping or just sequential row numbers
    const householdNumbers = Array.from(residentsByRow.values())
      .filter(r => r.householdNo)
      .map(r => parseInt(r.householdNo));
    
    // If household numbers are sequential (1,2,3,4...), they're probably row numbers, not household IDs
    // Use smart grouping instead
    const isSequential = householdNumbers.length > 1 && 
      householdNumbers.every((num, idx) => idx === 0 || num === householdNumbers[idx - 1] + 1);
    
    const useSmartGrouping = !householdNumbers.length || isSequential;
    
    if (!useSmartGrouping) {
      // Use explicit household numbers from NO. column
      console.log("Using explicit household numbers from NO. column");
      residentsByRow.forEach((residentInfo, rowIndex) => {
        const { residentId, householdNo, role, address } = residentInfo;
        
        if (householdNo) {
          if (!householdsByNo.has(String(householdNo))) {
            householdsByNo.set(String(householdNo), {
              head: null,
              members: [],
              address: address
            });
          }
          
          const household = householdsByNo.get(String(householdNo));
          if (role === "HEAD") {
            household.head = residentId;
            household.members.push(residentId);
            console.log(`  -> Added as HEAD to household ${householdNo}`);
          } else {
            household.members.push(residentId);
            console.log(`  -> Added as MEMBER to household ${householdNo}`);
          }
        }
      });
    } else {
      // Smart grouping: HEAD followed by MEMBERs form a household
      console.log("Using smart grouping based on HEAD->MEMBER pattern");
      let currentHouseholdId = 1;
      let currentHousehold = null;
      
      Array.from(residentsByRow.entries()).forEach(([rowIndex, residentInfo]) => {
        const { residentId, role, address, firstName, lastName } = residentInfo;
        
        if (role === "HEAD") {
          // Start a new household
          const householdKey = `auto-${currentHouseholdId}`;
          currentHousehold = {
            head: residentId,
            members: [residentId],
            address: address
          };
          householdsByNo.set(householdKey, currentHousehold);
          console.log(`  -> Created new household ${householdKey} with HEAD: ${firstName} ${lastName}`);
          currentHouseholdId++;
        } else if (role === "MEMBER" && currentHousehold) {
          // Add to current household
          currentHousehold.members.push(residentId);
          console.log(`  -> Added MEMBER ${firstName} ${lastName} to current household`);
        } else {
          console.log(`  -> Skipping resident ${firstName} ${lastName} - no household context`);
        }
      });
    }
    
    // Second pass: Create households
    for (const [householdNo, householdData] of householdsByNo.entries()) {
      if (!householdData.head) {
        console.log(`Skipping household ${householdNo}: No HEAD found`);
        continue;
      }
      
      try {
        // Check if household already exists with this head
        const existingHousehold = await Household.findOne({ headOfHousehold: householdData.head });
        
        if (existingHousehold) {
          // Update existing household
          await Household.updateOne(
            { _id: existingHousehold._id },
            { 
              $set: {
                members: householdData.members,
                address: householdData.address
              }
            }
          );
          results.householdsUpdated++;
          console.log(`Updated household ${existingHousehold.householdId} with ${householdData.members.length} members`);
        } else {
          // Create new household ID
          const lastHousehold = await Household.findOne().sort({ householdId: -1 });
          let nextNum = 1;
          if (lastHousehold && lastHousehold.householdId) {
            const match = lastHousehold.householdId.match(/HH-(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
          }
          const householdId = `HH-${String(nextNum).padStart(4, "0")}`;
          
          console.log(`Creating household ${householdId}:`, {
            head: householdData.head,
            membersCount: householdData.members.length,
            members: householdData.members
          });
          
          await Household.create({
            householdId,
            headOfHousehold: householdData.head,
            members: householdData.members,
            address: householdData.address
          });
          results.householdsCreated++;
          console.log(`✅ Created household ${householdId} with ${householdData.members.length} members`);
        }
      } catch (err) {
        console.error(`Error creating/updating household ${householdNo}:`, err);
        results.errors.push({ 
          row: `Household ${householdNo}`, 
          message: err.message 
        });
      }
    }

    res.json({
      message: `✅ Import complete: ${results.created} residents created, ${results.updated} updated, ${results.skipped} skipped. ${results.householdsCreated} households created, ${results.householdsUpdated} updated.`,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      householdsCreated: results.householdsCreated,
      householdsUpdated: results.householdsUpdated,
      errors: results.errors,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({ message: err.message || "Import failed" });
  }
};

exports.importResidents = exports.bulkImport;

// Optional: placeholder if you plan to add file upload middleware later
exports.importResidentsMiddleware = (req, res, next) => next();
