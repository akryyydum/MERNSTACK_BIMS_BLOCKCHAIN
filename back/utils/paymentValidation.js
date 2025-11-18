const Household = require('../models/household.model');
const UtilityPayment = require('../models/utilityPayment.model');
const Settings = require('../models/settings.model');

/**
 * Helper to get current month in "YYYY-MM" format
 */
function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Helper to get current year
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Helper to calculate yearly balance for a fee type
 */
async function calculateYearlyBalance(householdId, feeType, defaultMonthlyAmount) {
  console.log(`=== YEARLY BALANCE CALCULATION for ${feeType} ===`);
  console.log("Household ID:", householdId);
  
  const currentYear = getCurrentYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // Get all utility payments for this year
  const yearlyPayments = await UtilityPayment.find({
    household: householdId,
    type: feeType,
    month: { $regex: `^${currentYear}-` }
  }).sort({ month: 1 }); // Sort by month ascending
  
  console.log(`Found ${yearlyPayments.length} payments for ${feeType} in ${currentYear}`);
  
  let totalOwed = 0;
  let totalPaid = 0;
  
  // Calculate for all 12 months (including future months to match admin calculation)
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
    const monthPayment = yearlyPayments.find(p => p.month === monthKey);
    
    if (monthPayment) {
      // Payment record exists
      totalOwed += monthPayment.totalCharge || defaultMonthlyAmount;
      totalPaid += monthPayment.amountPaid || 0;
      console.log(`Month ${month} (${monthKey}): Owed=${monthPayment.totalCharge}, Paid=${monthPayment.amountPaid}, Balance=${monthPayment.balance}`);
    } else {
      // No payment record for this month, so full amount is owed
      totalOwed += defaultMonthlyAmount;
      totalPaid += 0; // No payment made
      console.log(`Month ${month} (${monthKey}): No record - Owed=${defaultMonthlyAmount}, Paid=0`);
    }
  }
  
  const yearlyBalance = Math.max(totalOwed - totalPaid, 0);
  
  console.log(`Final calculation for ${feeType}:`);
  console.log(`- Total owed for ${currentMonth} months: ${totalOwed}`);
  console.log(`- Total paid: ${totalPaid}`);
  console.log(`- Yearly balance: ${yearlyBalance}`);
  console.log("================================================");
  
  return yearlyBalance;
}

/**
 * Check if a household has unpaid garbage and streetlight fees
 * @param {string} householdId - The household ID to check
 * @returns {Promise<Object>} - Returns payment status information
 */
async function checkHouseholdPaymentStatus(householdId) {
  try {
    const household = await Household.findById(householdId);
    if (!household) {
      throw new Error('Household not found');
    }

    const currentMonth = getCurrentMonthKey();
    
    // Dynamic amounts from settings
      const settings = await Settings.getSingleton();
      const garbageMonthlyAmount = household.hasBusiness
        ? settings.garbageFeeBusinessAnnual
        : settings.garbageFeeRegularAnnual;
    const streetlightMonthlyAmount = settings.streetlightMonthlyFee;
    
    // Check current month payment status
    const garbagePayment = await UtilityPayment.findOne({
      household: householdId,
      type: 'garbage',
      month: currentMonth
    });

    const streetlightPayment = await UtilityPayment.findOne({
      household: householdId,
      type: 'streetlight', 
      month: currentMonth
    });

    // Check if fees are truly paid (balance should be 0)
    const garbagePaid = garbagePayment ? (garbagePayment.balance || 0) <= 0 : false;
    const streetlightPaid = streetlightPayment ? (streetlightPayment.balance || 0) <= 0 : false;
    
    console.log("Payment status check:");
    console.log("Garbage payment record:", garbagePayment);
    console.log("Garbage paid status (balance <= 0):", garbagePaid);
    console.log("Streetlight payment record:", streetlightPayment);
    console.log("Streetlight paid status (balance <= 0):", streetlightPaid);

    // Calculate current month outstanding amounts
    let garbageMonthlyBalance = 0;
    let streetlightMonthlyBalance = 0;

    if (garbagePayment) {
      // Use the actual balance from the payment record
      garbageMonthlyBalance = Math.max(garbagePayment.balance || 0, 0);
    } else {
      // No payment record, so full amount is due
      garbageMonthlyBalance = garbageMonthlyAmount;
    }

    if (streetlightPayment) {
      // Use the actual balance from the payment record
      streetlightMonthlyBalance = Math.max(streetlightPayment.balance || 0, 0);
    } else {
      // No payment record, so full amount is due
      streetlightMonthlyBalance = streetlightMonthlyAmount;
    }
    
    console.log("Monthly balance calculation:");
    console.log("Garbage monthly balance:", garbageMonthlyBalance);
    console.log("Streetlight monthly balance:", streetlightMonthlyBalance);

    // Calculate yearly balances
    const garbageYearlyBalance = await calculateYearlyBalance(householdId, 'garbage', garbageMonthlyAmount);
    const streetlightYearlyBalance = await calculateYearlyBalance(householdId, 'streetlight', streetlightMonthlyAmount);

    console.log("=== PAYMENT CALCULATION DEBUG ===");
    console.log("Household ID:", householdId);
    console.log("Garbage monthly amount:", garbageMonthlyAmount);
    console.log("Garbage payment record:", garbagePayment);
    console.log("Garbage monthly balance calculated:", garbageMonthlyBalance);
    console.log("Garbage yearly balance calculated:", garbageYearlyBalance);
    console.log("Streetlight monthly amount:", streetlightMonthlyAmount);
    console.log("Streetlight payment record:", streetlightPayment);
    console.log("Streetlight monthly balance calculated:", streetlightMonthlyBalance);
    console.log("Streetlight yearly balance calculated:", streetlightYearlyBalance);
    console.log("====================================");

    return {
      canRequestDocument: garbagePaid && streetlightPaid,
      garbageFee: {
        paid: garbagePaid,
        monthlyBalance: garbageMonthlyBalance,
        yearlyBalance: garbageYearlyBalance,
        monthlyAmount: garbageMonthlyAmount,
        status: garbagePayment?.status || 'unpaid'
      },
      streetlightFee: {
        paid: streetlightPaid,
        monthlyBalance: streetlightMonthlyBalance,
        yearlyBalance: streetlightYearlyBalance,
        monthlyAmount: streetlightMonthlyAmount,
        status: streetlightPayment?.status || 'unpaid'
      },
      currentMonth: currentMonth,
      currentYear: getCurrentYear()
    };
  } catch (error) {
    console.error('Error checking household payment status:', error);
    throw error;
  }
}

/**
 * Check if a resident can request documents based on their household's payment status
 * @param {string} residentId - The resident ID to check
 * @returns {Promise<Object>} - Returns validation result
 */
async function validateResidentPaymentStatus(residentId) {
  try {
    console.log("=== VALIDATE RESIDENT PAYMENT STATUS ===");
    console.log("Resident ID:", residentId);
    
    const Resident = require('../models/resident.model');
    
    const resident = await Resident.findById(residentId);
    console.log("Found resident:", resident ? {
      id: resident._id,
      name: `${resident.firstName} ${resident.lastName}`
    } : 'null');
    
    if (!resident) {
      throw new Error('Resident not found');
    }

    // Find the household that contains this resident
    const household = await Household.findOne({
      $or: [
        { headOfHousehold: residentId },
        { members: residentId }
      ]
    });

    console.log("Found household:", household ? {
      id: household._id,
      householdId: household.householdId,
      headOfHousehold: household.headOfHousehold,
      members: household.members
    } : 'null');

    if (!household) {
      console.log("No household found for resident");
      throw new Error('Resident is not associated with any household');
    }

    console.log("Checking payment status for household:", household._id);
    const paymentStatus = await checkHouseholdPaymentStatus(household._id);
    console.log("Payment status result:", paymentStatus);
    
    return {
      isValid: paymentStatus.canRequestDocument,
      resident: {
        name: `${resident.firstName} ${resident.lastName}`,
        householdId: household.householdId
      },
      paymentStatus,
      message: paymentStatus.canRequestDocument 
        ? 'All payments are up to date' 
        : 'Outstanding payments must be settled before requesting documents'
    };
  } catch (error) {
    console.error('Error validating resident payment status:', error);
    throw error;
  }
}

module.exports = {
  checkHouseholdPaymentStatus,
  validateResidentPaymentStatus,
  getCurrentMonthKey,
  getCurrentYear
};