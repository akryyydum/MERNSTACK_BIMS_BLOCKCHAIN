const Household = require("../models/household.model");
const Resident = require("../models/resident.model");
const Counter = require("../models/counter.model");
const Settings = require('../models/settings.model');
// const GasPayment = require("../models/gasPayment.model");
const UtilityPayment = require("../models/utilityPayment.model");
const FinancialTransaction = require("../models/financialTransaction.model");
const dayjs = require("dayjs");
const { getContract } = require('../utils/fabricClient');
const { submitFinancialTransactionToFabric } = require('../utils/financialFabric');

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
  const seq = String(doc.seq).padStart(5, "0");
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
        { "address.purok": rx },
        { "address.barangay": rx },
        { "address.municipality": rx },
        { "address.province": rx },
      ];
    }
    const items = await Household.find(q)
      .populate("headOfHousehold", "firstName middleName lastName suffix dateOfBirth birthPlace sex civilStatus citizenship occupation sectoralInformation employmentStatus")
      .populate("members", "firstName middleName lastName suffix dateOfBirth birthPlace sex civilStatus citizenship occupation sectoralInformation employmentStatus")
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { headOfHousehold, members = [], address = {}, hasBusiness, businessType } = req.body;

    if (!headOfHousehold || !members?.length || !address.purok) {
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
      garbageFee: {},
      electricFee: {},
      streetlightFee: {},
      hasBusiness: hasBusiness || false,
      businessType: businessType || null,
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

// Effective fee helpers using Settings fee history
async function calculateGarbageFee(household, monthKeyStr) {
  const monthStr = monthKeyStr || monthKey();
  const regularAnnual = await Settings.getEffectiveFee('garbage_regular_annual', monthStr);
  const businessAnnual = await Settings.getEffectiveFee('garbage_business_annual', monthStr);
  const annual = household.hasBusiness ? businessAnnual : regularAnnual;
  // Values are stored as monthly totals
  return Number(annual);
}

async function calculateStreetlightFee(monthKeyStr) {
  const monthStr = monthKeyStr || monthKey();
  const fee = await Settings.getEffectiveFee('streetlight_monthly', monthStr);
  return Number(fee);
}

// Generic summary fetcher
async function getUtilitySummary(householdId, type, month) {
  const hh = await Household.findById(householdId).lean();
  if (!hh) return { error: "Household not found", status: 404 };

  const m = (month || monthKey()).trim();
  let summary = await UtilityPayment.findOne({ household: householdId, type, month: m }).lean();
  if (!summary) {
    const snap = type === "garbage" ? hh.garbageFee : type === "streetlight" ? hh.streetlightFee : hh.electricFee;
    let totalCharge;
    
    if (type === "garbage") {
      totalCharge = await calculateGarbageFee(hh, m);
    } else if (type === "streetlight") {
      totalCharge = await calculateStreetlightFee(m);
    } else {
      totalCharge = Number(snap?.currentMonthCharge || 0);
    }
    
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
async function payUtility(householdId, type, { month, amount, totalCharge, method, reference, hasBusiness }, user) {
  if (amount === undefined || Number(amount) <= 0) {
    return { error: "amount must be greater than 0", status: 400 };
  }

  const hh = await Household.findById(householdId);
  if (!hh) return { error: "Household not found", status: 404 };

  // Update business status if provided (for garbage payments)
  if (type === "garbage" && hasBusiness !== undefined) {
    hh.hasBusiness = Boolean(hasBusiness);
    await hh.save();
  }

  const m = (month || monthKey()).trim();

  // Upsert summary for month
  let summary = await UtilityPayment.findOne({ household: householdId, type, month: m });
  if (!summary) {
    let defaultCharge;
    if (type === "garbage") {
      defaultCharge = await calculateGarbageFee(hh, m);
    } else if (type === "streetlight") {
      defaultCharge = await calculateStreetlightFee(m);
    } else {
      defaultCharge = hh?.electricFee?.currentMonthCharge || 0;
    }
    
    summary = new UtilityPayment({
      household: householdId,
      type,
      month: m,
      totalCharge: Number(totalCharge || defaultCharge),
      amountPaid: 0,
      balance: 0,
      status: "unpaid",
      payments: [],
    });
  }

  if (totalCharge !== undefined) {
    summary.totalCharge = Number(totalCharge);
  }

  const paymentRecord = {
    amount: Number(amount),
    method,
    reference,
    paidAt: new Date(),
  };
  summary.payments.push(paymentRecord);

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
  else if (type === "streetlight") hh.streetlightFee = snap;
  else hh.electricFee = snap;
  await hh.save();

  const transactionTypeMap = {
    garbage: "garbage_fee",
    electric: "electric_fee",
    streetlight: "streetlight_fee",
  };

  let createdTransaction = null;
  try {
    createdTransaction = await FinancialTransaction.create({
      type: transactionTypeMap[type] || "other",
      category: "revenue",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} fee payment for ${hh.householdId} (${m})`,
      amount: Number(amount),
      residentId: hh.headOfHousehold,
      householdId: hh._id,
      paymentMethod: method || "cash",
      status: "completed",
      transactionDate: paymentRecord.paidAt,
      createdBy: user?.id || user?._id,
      updatedBy: user?.id || user?._id,
    });
  } catch (err) {
    console.error("Failed to log financial transaction:", err);
  }

  // Mirror to Fabric blockchain: create a lightweight on-chain request and a financial transaction linked to it
  try {
    // resident name for on-chain metadata
    const resident = await Resident.findById(hh.headOfHousehold).select('firstName lastName');
    const residentName = resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown Resident';

    const requestId = `UTIL-${type.toUpperCase()}-${hh._id.toString().slice(-8)}-${m.replace(/[^0-9A-Za-z-]/g, '')}`;

    const { gateway, contract } = await getContract();

    // Create a request on-chain (idempotent attempt)
    try {
      await contract.submitTransaction(
        'createRequest',
        requestId,
        String(hh.headOfHousehold || ''),
        residentName,
        `${type}_payment`,
        `Utility payment for ${hh.householdId} ${m}`,
        'completed'
      );
    } catch (e) {
      // non-fatal, maybe already exists
      console.warn('createRequest on-chain skipped or failed:', e.message || e);
    }

    // Submit the financial transaction on-chain
    try {
      const txId = createdTransaction?._id?.toString() || `TX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      await contract.submitTransaction(
        'FinancialTransactionContract:createTransaction',
        txId,
        requestId,
        String(hh.headOfHousehold || ''),
        residentName,
        String(Number(amount || 0)),
        method || 'cash',
        `Utility ${type} payment for ${hh.householdId} ${m}`
      );
      console.log('Submitted utility financial transaction to Fabric:', txId);
    } catch (e) {
      console.error('Failed to submit financial transaction to Fabric for utility payment:', e.message || e);
    }

    await gateway.disconnect();
  } catch (err) {
    console.error('Error while attempting to mirror utility payment to Fabric:', err.message || err);
  }

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
    const { summary, error, status } = await payUtility(req.params.id, "garbage", req.body || {}, req.user);
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
    const { summary, error, status } = await payUtility(req.params.id, "electric", req.body || {}, req.user);
    if (error) return res.status(status).json({ message: error });
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/households/:id/streetlight?month=YYYY-MM
exports.streetlightSummary = async (req, res) => {
  try {
    const { summary, error, status } = await getUtilitySummary(req.params.id, "streetlight", req.query.month);
    if (error) return res.status(status).json({ message: error });
    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/households/:id/streetlight/pay
exports.payStreetlight = async (req, res) => {
  try {
    const { summary, error, status } = await payUtility(req.params.id, "streetlight", req.body || {}, req.user);
    if (error) return res.status(status).json({ message: error });
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/garbage-payments - List all garbage payments
exports.listGarbagePayments = async (req, res) => {
  try {
    const { householdId } = req.query;
    const filter = { type: "garbage" };
    
    // If householdId is provided, filter by specific household
    if (householdId) {
      filter.household = householdId;
    }
    
    const payments = await UtilityPayment.find(filter)
      .populate("household", "householdId address headOfHousehold")
      .sort({ month: -1, createdAt: -1 })
      .lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/garbage-statistics - Get garbage payment statistics
exports.getGarbageStatistics = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get all households
    const households = await Household.find({}).lean();
    const totalHouseholds = households.length;
    
    // Expected monthly (current month) and yearly totals using historical fees
    let expectedMonthly = 0;
    let expectedYearly = 0;
    const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    for (const hh of households) {
      // Current month expected
      const currentMonthFee = await calculateGarbageFee(hh, currentMonthStr);
      expectedMonthly += currentMonthFee;
      // Each month of year
      for (let m = 1; m <= 12; m++) {
        const monthStr = `${currentYear}-${String(m).padStart(2, '0')}`;
        expectedYearly += await calculateGarbageFee(hh, monthStr);
      }
    }
    
    // Get all garbage payments for current year
    const yearPayments = await UtilityPayment.find({ 
      type: "garbage",
      month: { $regex: `^${currentYear}-` }
    }).lean();
    
    // Calculate balances using the same logic as the frontend table
    let totalYearlyBalance = 0;
    let totalYearlyCollected = 0;
    let totalMonthlyBalance = 0;
    let totalMonthlyCollected = 0;
    
    const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    for (const household of households) {
      let householdYearlyBalance = 0;
      let householdYearlyPaid = 0;
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
        const monthPayment = yearPayments.find(payment =>
          payment.household && payment.household.toString() === household._id.toString() &&
          payment.month === monthStr
        );
        const defaultFee = await calculateGarbageFee(household, monthStr);
        if (monthPayment) {
          householdYearlyBalance += Number(monthPayment.balance || 0);
          householdYearlyPaid += Number(monthPayment.amountPaid || 0);
          if (monthStr === currentMonth) {
            totalMonthlyBalance += Number(monthPayment.balance || 0);
            totalMonthlyCollected += Number(monthPayment.amountPaid || 0);
          }
        } else {
          householdYearlyBalance += defaultFee;
          if (monthStr === currentMonth) {
            totalMonthlyBalance += defaultFee;
          }
        }
      }
      totalYearlyBalance += householdYearlyBalance;
      totalYearlyCollected += householdYearlyPaid;
    }
    
    // Calculate collection rate
    const collectionRate = expectedYearly > 0 ? ((totalYearlyCollected / expectedYearly) * 100) : 0;
    
    res.json({
      totalHouseholds,
      feeStructure: {
        noBusiness: 35,
        withBusiness: 50,
        expectedMonthly: parseFloat(expectedMonthly.toFixed(2)),
        expectedYearly: parseFloat(expectedYearly.toFixed(2))
      },
      totalCollected: {
        yearly: parseFloat(totalYearlyCollected.toFixed(2)),
        monthly: parseFloat(totalMonthlyCollected.toFixed(2))
      },
      balance: {
        yearly: parseFloat(totalYearlyBalance.toFixed(2)),
        monthly: parseFloat(totalMonthlyBalance.toFixed(2))
      },
      collectionRate: parseFloat(collectionRate.toFixed(1))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/streetlight-payments - List all streetlight payments
exports.listStreetlightPayments = async (req, res) => {
  try {
    const { householdId } = req.query;
    const filter = { type: "streetlight" };
    
    // If householdId is provided, filter by specific household
    if (householdId) {
      filter.household = householdId;
    }
    
    const payments = await UtilityPayment.find(filter)
      .populate("household", "householdId address headOfHousehold")
      .sort({ month: -1, createdAt: -1 })
      .lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/streetlight-statistics - Get streetlight payment statistics
exports.getStreetlightStatistics = async (req, res) => {
  try {
    const currentMonth = monthKey();
    
    // Get all households
    const households = await Household.find({}).lean();
    const totalHouseholds = households.length;
    
    // Calculate expected revenue using potential historical streetlight fee for current month
    const currentMonthFee = await calculateStreetlightFee(currentMonth);
    const expectedRevenue = totalHouseholds * currentMonthFee;
    
    // Get current month payments
    const currentMonthPayments = await UtilityPayment.find({ 
      type: "streetlight", 
      month: currentMonth 
    }).lean();
    
    // Calculate statistics
    const totalCollected = currentMonthPayments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
    const totalOutstanding = expectedRevenue - totalCollected;
    const collectionRate = expectedRevenue > 0 ? ((totalCollected / expectedRevenue) * 100) : 0;
    
    // Current month applied rate
    const monthlyRate = currentMonthFee;
    
    res.json({
      totalHouseholds,
      monthlyRate,
      expectedRevenue,
      totalCollected,
      totalOutstanding,
      collectionRate: parseFloat(collectionRate.toFixed(1))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/households/:id/garbage/payments - Delete all garbage payments for a household
exports.deleteGarbagePayments = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[DELETE GARBAGE] Starting deletion for household ID: ${id}`);
    
    // Verify household exists
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }
    
    // Check existing records before deletion
    const existingRecords = await UtilityPayment.find({ 
      household: id, 
      type: "garbage" 
    });
    console.log(`[DELETE GARBAGE] Found ${existingRecords.length} existing records to delete`);
    console.log(`[DELETE GARBAGE] Records:`, existingRecords.map(r => ({ 
      id: r._id, 
      month: r.month, 
      amountPaid: r.amountPaid,
      paymentsCount: r.payments?.length || 0
    })));
    
    // Delete all garbage payment records for this household
    const result = await UtilityPayment.deleteMany({ 
      household: id, 
      type: "garbage" 
    });
    
    console.log(`[DELETE GARBAGE] Deletion result:`, result);
    
    // Reset household garbage fee to default
    household.garbageFee = {
      currentMonthCharge: 0,
      balance: 0,
      lastPaymentDate: null
    };
    await household.save();
    
    console.log(`[DELETE GARBAGE] Household ${household.householdId} reset completed`);
    
    // Verify deletion was successful by checking remaining records
    const remainingRecords = await UtilityPayment.find({ 
      household: id, 
      type: "garbage" 
    });
    console.log(`[DELETE GARBAGE] Remaining records after deletion: ${remainingRecords.length}`);
    
    res.json({ 
      message: `Deleted ${result.deletedCount} garbage payment records for household ${household.householdId}`,
      deletedCount: result.deletedCount,
      remainingRecords: remainingRecords.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/households/:id/streetlight/payments - Delete all streetlight payments for a household
exports.deleteStreetlightPayments = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[DELETE STREETLIGHT] Starting deletion for household ID: ${id}`);
    
    // Verify household exists
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }
    
    // Check existing records before deletion
    const existingRecords = await UtilityPayment.find({ 
      household: id, 
      type: "streetlight" 
    });
    console.log(`[DELETE STREETLIGHT] Found ${existingRecords.length} existing records to delete`);
    console.log(`[DELETE STREETLIGHT] Records:`, existingRecords.map(r => ({ 
      id: r._id, 
      month: r.month, 
      amountPaid: r.amountPaid,
      paymentsCount: r.payments?.length || 0
    })));
    
    // Delete all streetlight payment records for this household
    const result = await UtilityPayment.deleteMany({ 
      household: id, 
      type: "streetlight" 
    });
    
    console.log(`[DELETE STREETLIGHT] Deletion result:`, result);
    
    // Reset household streetlight fee to default
    household.streetlightFee = {
      currentMonthCharge: 0,
      balance: 0,
      lastPaymentDate: null
    };
    await household.save();
    
    console.log(`[DELETE STREETLIGHT] Household ${household.householdId} reset completed`);
    
    // Verify deletion was successful by checking remaining records
    const remainingRecords = await UtilityPayment.find({ 
      household: id, 
      type: "streetlight" 
    });
    console.log(`[DELETE STREETLIGHT] Remaining records after deletion: ${remainingRecords.length}`);
    
    res.json({ 
      message: `Deleted ${result.deletedCount} streetlight payment records for household ${household.householdId}`,
      deletedCount: result.deletedCount,
      remainingRecords: remainingRecords.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Resident-accessible functions
exports.getResidentHousehold = async (req, res) => {
  try {
    console.log("getResidentHousehold - req.user:", req.user);
    const userId = req.user.id || req.user._id || req.user.userId; // Try different possible ID fields
    console.log("Looking for resident with user ID:", userId);
    
    if (!userId) {
      console.log("No user ID found in token");
      return res.status(400).json({ message: "No user ID found in authentication token" });
    }
    
    // First find the resident record for this user
    const resident = await Resident.findOne({ user: userId });
    if (!resident) {
      console.log("No resident record found for user ID:", userId);
      return res.status(404).json({ message: "Resident profile not found" });
    }
    
    console.log("Found resident:", resident._id);
    
    // Find household where the resident is either head or member
    const household = await Household.findOne({
      $or: [
        { headOfHousehold: resident._id },
        { members: resident._id }
      ]
    })
    .populate("headOfHousehold", "firstName middleName lastName")
    .populate("members", "firstName middleName lastName")
    .lean();
    
    console.log("Found household:", household ? household.householdId : "Not found");
    
    if (!household) {
      return res.status(404).json({ message: "No household found for this resident" });
    }
    
    res.json(household);
  } catch (err) {
    console.error("Error in getResidentHousehold:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getResidentPayments = async (req, res) => {
  try {
    console.log("getResidentPayments - req.user:", req.user);
    const residentId = req.user.id || req.user._id || req.user.userId; // Try different possible ID fields
    console.log("Looking for payments with resident ID:", residentId);
    
    if (!residentId) {
      console.log("No resident ID found in token");
      return res.status(400).json({ message: "No resident ID found in authentication token" });
    }
    
    // Find household for this resident
    const household = await Household.findOne({
      $or: [
        { headOfHousehold: residentId },
        { members: residentId }
      ]
    }).lean();
    
    console.log("Found household for payments:", household ? household.householdId : "Not found");
    
    if (!household) {
      return res.status(404).json({ message: "No household found for this resident" });
    }
    
    // Get all payments for this household
    const payments = await UtilityPayment.find({ 
      household: household._id,
      type: { $in: ["garbage", "streetlight"] }
    })
    .populate('household', 'householdId hasBusiness')
    .sort({ month: -1 })
    .lean();
    
    console.log(`Found ${payments.length} payments for household ${household.householdId}`);
    res.json(payments);
  } catch (err) {
    console.error("Error in getResidentPayments:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/garbage-statistics - Get garbage payment statistics
exports.getGarbageStatistics = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = dayjs().format('YYYY-MM');
    
    console.log('Fetching garbage statistics for year:', currentYear);
    console.log('Current month:', currentMonth);

    // Get all households
    const households = await Household.find({}).populate('headOfHousehold').lean();
    const totalHouseholds = households.length;

    console.log('Total households found:', totalHouseholds);

    // Calculate expected totals using historical fees
    let expectedMonthly = 0;
    let expectedYearly = 0;
    for (const hh of households) {
      const currentMonthFee = await calculateGarbageFee(hh, currentMonth);
      expectedMonthly += currentMonthFee;
      for (let m = 1; m <= 12; m++) {
        const monthStr = `${currentYear}-${String(m).padStart(2, '0')}`;
        expectedYearly += await calculateGarbageFee(hh, monthStr);
      }
    }

    console.log('Expected monthly total:', expectedMonthly);
    console.log('Expected yearly total:', expectedYearly);

    // Get all garbage payments for current year
    const garbagePayments = await UtilityPayment.find({
      type: 'garbage',
      month: { $regex: `^${currentYear}-` }
    }).populate('household', 'householdId hasBusiness').lean();

    console.log('Garbage payments found:', garbagePayments.length);

    // Calculate totals
    let yearlyCollected = 0;
    let monthlyCollected = 0;
    
    garbagePayments.forEach(payment => {
      if (payment.household && payment.amountPaid > 0) {
        yearlyCollected += payment.amountPaid || 0;
        if (payment.month === currentMonth) monthlyCollected += payment.amountPaid || 0;
      }
    });

    const yearlyOutstanding = expectedYearly - yearlyCollected;
    const monthlyOutstanding = expectedMonthly - monthlyCollected;
    const collectionRate = expectedYearly > 0 ? (yearlyCollected / expectedYearly) * 100 : 0;

    console.log('Final statistics:', {
      totalHouseholds,
      expectedMonthly,
      expectedYearly,
      yearlyCollected,
      monthlyCollected,
      yearlyOutstanding,
      monthlyOutstanding,
      collectionRate
    });

    res.json({
      totalHouseholds,
      feeStructure: {
        // Provide base current month rates (derived from average household current month fees for transparency)
        noBusiness: await Settings.getEffectiveFee('garbage_regular_annual', currentMonth),
        withBusiness: await Settings.getEffectiveFee('garbage_business_annual', currentMonth),
        expectedMonthly,
        expectedYearly
      },
      totalCollected: {
        yearly: yearlyCollected,
        monthly: monthlyCollected
      },
      balance: {
        yearly: yearlyOutstanding,
        monthly: monthlyOutstanding
      },
      collectionRate: parseFloat(collectionRate.toFixed(1))
    });

  } catch (error) {
    console.error('Error getting garbage statistics:', error);
    res.status(500).json({ 
      message: 'Failed to get garbage statistics', 
      error: error.message 
    });
  }
};

// GET /api/admin/streetlight-statistics - Get streetlight payment statistics
exports.getStreetlightStatistics = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = dayjs().format('YYYY-MM');
    
    console.log('Fetching streetlight statistics for year:', currentYear);
    console.log('Current month:', currentMonth);

    // Get all households
    const households = await Household.find({}).populate('headOfHousehold').lean();
    const totalHouseholds = households.length;

    console.log('Total households found:', totalHouseholds);

    // Calculate expected totals using historical streetlight fee changes
    let expectedMonthly = 0;
    let expectedYearly = 0;
    const currentMonthRate = await calculateStreetlightFee(currentMonth);
    expectedMonthly = totalHouseholds * currentMonthRate;
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${String(m).padStart(2, '0')}`;
      const rate = await calculateStreetlightFee(monthStr);
      expectedYearly += totalHouseholds * rate;
    }

    console.log('Expected monthly total:', expectedMonthly);
    console.log('Expected yearly total:', expectedYearly);

    // Get all streetlight payments for current year
    const streetlightPayments = await UtilityPayment.find({
      type: 'streetlight',
      month: { $regex: `^${currentYear}-` }
    }).populate('household', 'householdId').lean();

    console.log('Streetlight payments found:', streetlightPayments.length);

    // Calculate totals
    let yearlyCollected = 0;
    let monthlyCollected = 0;
    
    streetlightPayments.forEach(payment => {
      if (payment.household && payment.amountPaid > 0) {
        yearlyCollected += payment.amountPaid || 0;
        if (payment.month === currentMonth) monthlyCollected += payment.amountPaid || 0;
      }
    });

    const yearlyOutstanding = expectedYearly - yearlyCollected;
    const monthlyOutstanding = expectedMonthly - monthlyCollected;
    const collectionRate = expectedYearly > 0 ? (yearlyCollected / expectedYearly) * 100 : 0;

    console.log('Final streetlight statistics:', {
      totalHouseholds,
      monthlyRate,
      expectedMonthly,
      expectedYearly,
      yearlyCollected,
      monthlyCollected,
      yearlyOutstanding,
      monthlyOutstanding,
      collectionRate
    });

    res.json({
      totalHouseholds,
      monthlyRate: currentMonthRate,
      totalCollected: {
        yearly: yearlyCollected,
        monthly: monthlyCollected
      },
      outstanding: {
        yearly: yearlyOutstanding,
        monthly: monthlyOutstanding
      },
      collectionRate: parseFloat(collectionRate.toFixed(1))
    });

  } catch (error) {
    console.error('Error getting streetlight statistics:', error);
    res.status(500).json({ 
      message: 'Failed to get streetlight statistics', 
      error: error.message 
    });
  }
};