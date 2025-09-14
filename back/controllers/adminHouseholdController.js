const Household = require("../models/household.model");
const Resident = require("../models/resident.model");
const Counter = require("../models/counter.model");
// const GasPayment = require("../models/gasPayment.model");
const UtilityPayment = require("../models/utilityPayment.model");

const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};

// Helper: generate HH-YYYY-XXX
async function generateHouseholdId() {
  const year = new Date().getFullYear();
  const key = `household-${year}`;
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const seq = String(doc.seq).padStart(3, "0");
  return `HH-${year}-${seq}`;
}

exports.list = async (req, res) => {
  try {
    const { search } = req.query;
    const q = {};
    if (search) {
      const rx = new RegExp(search, "i");
      q.$or = [
        { householdId: rx },
        { "address.street": rx },
        { "address.purok": rx },
        { "address.barangay": rx },
        { "address.municipality": rx },
        { "address.province": rx },
      ];
    }
    const items = await Household.find(q)
      .populate("headOfHousehold", "firstName middleName lastName")
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { headOfHousehold, members = [], address = {}, gasFee } = req.body;

    if (!headOfHousehold || !members?.length || !address.street || !address.purok) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const uniqueMembers = Array.from(new Set([headOfHousehold, ...members]));

    // Validate residents exist
    const count = await Resident.countDocuments({ _id: { $in: uniqueMembers } });
    if (count !== uniqueMembers.length) {
      return res.status(400).json({ message: "Some members not found" });
    }

    // Prevent assigning a resident that already belongs to a household
    const conflict = await Household.findOne({
      $or: [
        { headOfHousehold: { $in: uniqueMembers } },
        { members: { $in: uniqueMembers } },
      ],
    });
    if (conflict) {
      return res.status(400).json({ message: "One or more selected residents already belong to another household" });
    }

    const finalAddress = { ...address, ...ADDRESS_DEFAULTS };
    const householdId = await generateHouseholdId();

    const created = await Household.create({
      householdId,
      headOfHousehold,
      members: uniqueMembers,
      address: finalAddress,
      gasFee: gasFee || {},
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };

    // Disallow changing householdId
    if (update.householdId) delete update.householdId;

    if (update.address) {
      update.address = { ...update.address, ...ADDRESS_DEFAULTS };
    }
    if (update.members && update.headOfHousehold) {
      update.members = Array.from(new Set([update.headOfHousehold, ...update.members]));
    }

    // Prevent assigning members that are already in other households
    if (update.headOfHousehold || update.members) {
      const membersToCheck = new Set();
      const nextHead = update.headOfHousehold ?? (await Household.findById(id).lean())?.headOfHousehold;
      const nextMembers = update.members ?? ((await Household.findById(id).lean())?.members || []);
      [nextHead, ...nextMembers].forEach(x => x && membersToCheck.add(String(x)));

      const conflict = await Household.findOne({
        _id: { $ne: id },
        $or: [
          { headOfHousehold: { $in: Array.from(membersToCheck) } },
          { members: { $in: Array.from(membersToCheck) } },
        ],
      }).lean();
      if (conflict) {
        return res.status(400).json({ message: "One or more selected residents already belong to another household" });
      }
    }

    const updated = await Household.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Household not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Household.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Household not found" });
    res.json({ message: "Household deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper to normalize month to "YYYY-MM"
function monthKey(d) {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

// Generic summary fetcher
async function getUtilitySummary(householdId, type, month) {
  const hh = await Household.findById(householdId).lean();
  if (!hh) return { error: "Household not found", status: 404 };

  const m = (month || monthKey()).trim();
  let summary = await UtilityPayment.findOne({ household: householdId, type, month: m }).lean();
  if (!summary) {
    const snap = type === "garbage" ? hh.garbageFee : hh.electricFee;
    const totalCharge = Number(snap?.currentMonthCharge || 0);
    summary = {
      household: householdId,
      type,
      month: m,
      totalCharge,
      amountPaid: 0,
      balance: totalCharge,
      status: totalCharge > 0 ? "unpaid" : "unpaid",
      payments: [],
    };
  }
  return { summary, status: 200 };
}

// Generic payer
async function payUtility(householdId, type, { month, amount, totalCharge, method, reference }) {
  if (amount === undefined || Number(amount) <= 0) {
    return { error: "amount must be greater than 0", status: 400 };
  }

  const hh = await Household.findById(householdId);
  if (!hh) return { error: "Household not found", status: 404 };

  const m = (month || monthKey()).trim();

  // Upsert summary for month
  let summary = await UtilityPayment.findOne({ household: householdId, type, month: m });
  if (!summary) {
    summary = new UtilityPayment({
      household: householdId,
      type,
      month: m,
      totalCharge: Number(totalCharge || (type === "garbage" ? hh?.garbageFee?.currentMonthCharge : hh?.electricFee?.currentMonthCharge) || 0),
      amountPaid: 0,
      balance: 0,
      status: "unpaid",
      payments: [],
    });
  }

  if (totalCharge !== undefined) {
    summary.totalCharge = Number(totalCharge);
  }

  summary.payments.push({
    amount: Number(amount),
    method,
    reference,
    paidAt: new Date(),
  });

  summary.amountPaid = (Number(summary.amountPaid) || 0) + Number(amount);
  const computedBalance = Math.max(Number(summary.totalCharge) - Number(summary.amountPaid), 0);
  summary.balance = computedBalance;
  summary.status =
    Number(summary.totalCharge) > 0
      ? computedBalance <= 0
        ? "paid"
        : "partial"
      : "unpaid";

  await summary.save();

  // Mirror to Household snapshot
  const snap = {
    currentMonthCharge: Number(summary.totalCharge),
    balance: Number(summary.balance),
    lastPaymentDate: new Date(),
  };
  if (type === "garbage") hh.garbageFee = snap;
  else hh.electricFee = snap;
  await hh.save();

  return { summary, status: 201 };
}

// GET /api/admin/households/:id/garbage?month=YYYY-MM
exports.garbageSummary = async (req, res) => {
  try {
    const { summary, error, status } = await getUtilitySummary(req.params.id, "garbage", req.query.month);
    if (error) return res.status(status).json({ message: error });
    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/households/:id/garbage/pay
exports.payGarbage = async (req, res) => {
  try {
    const { summary, error, status } = await payUtility(req.params.id, "garbage", req.body || {});
    if (error) return res.status(status).json({ message: error });
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/households/:id/electric?month=YYYY-MM
exports.electricSummary = async (req, res) => {
  try {
    const { summary, error, status } = await getUtilitySummary(req.params.id, "electric", req.query.month);
    if (error) return res.status(status).json({ message: error });
    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/households/:id/electric/pay
exports.payElectric = async (req, res) => {
  try {
    const { summary, error, status } = await payUtility(req.params.id, "electric", req.body || {});
    if (error) return res.status(status).json({ message: error });
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};