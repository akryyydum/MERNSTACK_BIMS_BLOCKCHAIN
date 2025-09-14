const Household = require("../models/household.model");
const Resident = require("../models/resident.model");
const Counter = require("../models/counter.model");
const GasPayment = require("../models/gasPayment.model");

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

// GET /api/admin/households/:id/gas?month=YYYY-MM
exports.gasSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const month = (req.query.month || new Date().toISOString().slice(0, 7)).trim(); // YYYY-MM

    const household = await Household.findById(id).lean();
    if (!household) return res.status(404).json({ message: "Household not found" });

    let summary = await GasPayment.findOne({ household: id, month }).lean();
    if (!summary) {
      // Initialize from household.gasFee if available
      const totalCharge = Number(household?.gasFee?.currentMonthCharge || 0);
      summary = {
        household: id,
        month,
        totalCharge,
        amountPaid: 0,
        balance: totalCharge,
        status: totalCharge > 0 ? "unpaid" : "unpaid",
        payments: [],
      };
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/households/:id/gas/pay
// body: { month: "YYYY-MM", amount, totalCharge?, method?, reference? }
exports.payGas = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      month = new Date().toISOString().slice(0, 7),
      amount,
      totalCharge,
      method,
      reference,
    } = req.body;

    if (amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    const household = await Household.findById(id);
    if (!household) return res.status(404).json({ message: "Household not found" });

    // Upsert summary for month
    let summary = await GasPayment.findOne({ household: id, month });
    if (!summary) {
      summary = new GasPayment({
        household: id,
        month,
        totalCharge: Number(totalCharge || household?.gasFee?.currentMonthCharge || 0),
        amountPaid: 0,
        balance: 0,
        status: "unpaid",
        payments: [],
      });
    }

    // Optionally update totalCharge if provided
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

    // Mirror to Household.gasFee (latest snapshot)
    household.gasFee = {
      currentMonthCharge: Number(summary.totalCharge),
      balance: Number(summary.balance),
      lastPaymentDate: new Date(),
    };
    await household.save();

    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};