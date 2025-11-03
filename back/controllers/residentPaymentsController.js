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

    // Fetch payment records for the household - all payments are in UtilityPayment collection
    // Fetch payment records for the household - all payments are in UtilityPayment collection
    const [utilityPayments, streetlightPayments, gasPayments] = await Promise.all([
      UtilityPayment.find({ household: household._id, type: 'garbage' }).sort({ month: 1 }).lean(),
      UtilityPayment.find({ household: household._id, type: 'streetlight' }).sort({ month: 1 }).lean(),
      GasPayment.find({ household: household._id }).sort({ month: 1 }).lean(),
    ]);

    // Calculate annual fees based on business status
    const currentYear = new Date().getFullYear();
    const annualGarbageFee = household.hasBusiness ? 600 : 420;
    const annualStreetlightFee = 120;

    // Calculate total paid amounts for current year
    const currentYearUtilityPayments = utilityPayments.filter(p => {
      const paymentYear = p.month ? parseInt(p.month.split('-')[0]) : currentYear;
      return paymentYear === currentYear;
    });

    const currentYearStreetlightPayments = streetlightPayments.filter(p => {
      const paymentYear = p.month ? parseInt(p.month.split('-')[0]) : currentYear;
      return paymentYear === currentYear;
    });

    const totalGarbagePaid = currentYearUtilityPayments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
    const totalStreetlightPaid = currentYearStreetlightPayments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

    // Add proper type labels to payments for frontend processing
    const utilityPaymentsWithType = utilityPayments.map(payment => ({
      ...payment,
      type: 'garbage',
      feeType: 'Garbage Fee'
    }));

    const streetlightPaymentsWithType = streetlightPayments.map(payment => ({
      ...payment,
      type: 'streetlight',
      feeType: 'Streetlight Fee'
    }));

    const gasPaymentsWithType = gasPayments.map(payment => ({
      ...payment,
      type: 'garbage',
      feeType: 'Garbage Fee'
    }));

    // Create payment summary with calculated outstanding balances
    const paymentSummary = {
      currentYear,
      household: {
        ...household,
        annualFees: {
          garbage: annualGarbageFee,
          streetlight: annualStreetlightFee
        }
      },
      garbageFees: {
        annualTotal: annualGarbageFee,
        totalPaid: totalGarbagePaid,
        outstandingBalance: Math.max(0, annualGarbageFee - totalGarbagePaid)
      },
      streetlightFees: {
        annualTotal: annualStreetlightFee,
        totalPaid: totalStreetlightPaid,
        outstandingBalance: Math.max(0, annualStreetlightFee - totalStreetlightPaid)
      },
      utilityPayments: utilityPaymentsWithType,
      streetlightPayments: streetlightPaymentsWithType,
      gasPayments: gasPaymentsWithType,
    };

    res.json(paymentSummary);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to load resident payments." });
  }
};

module.exports = {
  getPayments,
};