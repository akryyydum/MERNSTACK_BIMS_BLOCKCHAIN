const Resident = require("../models/resident.model");
const Household = require("../models/household.model");
const UtilityPayment = require("../models/utilityPayment.model");
const StreetlightPayment = require("../models/streetlightPayment.model");
const GasPayment = require("../models/gasPayment.model");

const resolveResidentContext = async (user) => {
  const userId = user?.id || user?._id;
  if (!userId) {
    const error = new Error("User context is missing.");
    error.status = 401;
    throw error;
  }

  const resident = await Resident.findOne({ user: userId }).select("_id").lean();
  if (!resident) {
    const error = new Error("Resident profile not found.");
    error.status = 404;
    throw error;
  }

  const household = await Household.findOne({
    $or: [{ headOfHousehold: resident._id }, { members: resident._id }],
  })
    .select("_id householdId hasBusiness")
    .lean();

  if (!household) {
    const error = new Error("No household found for this resident.");
    error.status = 404;
    throw error;
  }

  return { resident, household };
};

const getPayments = async (req, res) => {
  try {
    const { household } = await resolveResidentContext(req.user);

    const [utilityPayments, streetlightPayments, gasPayments] = await Promise.all([
      UtilityPayment.find({ household: household._id }).sort({ month: 1 }).lean(),
      StreetlightPayment.find({ household: household._id }).sort({ month: 1 }).lean(),
      GasPayment.find({ household: household._id }).sort({ month: 1 }).lean(),
    ]);

    res.json({
      household,
      utilityPayments,
      streetlightPayments,
      gasPayments,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to load resident payments." });
  }
};

module.exports = {
  getPayments,
};