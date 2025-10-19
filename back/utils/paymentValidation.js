const Household = require('../models/household.model');
const UtilityPayment = require('../models/utilityPayment.model');

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
    
    // Check garbage payment status
    const garbagePayment = await UtilityPayment.findOne({
      household: householdId,
      type: 'garbage',
      month: currentMonth
    });

    // Check streetlight payment status
    const streetlightPayment = await UtilityPayment.findOne({
      household: householdId,
      type: 'streetlight', 
      month: currentMonth
    });

    // Determine if fees are paid
    const garbagePaid = garbagePayment?.status === 'paid';
    const streetlightPaid = streetlightPayment?.status === 'paid';

    // Calculate outstanding amounts
    const garbageBalance = garbagePayment?.balance || (household.hasBusiness ? 50 : 35);
    const streetlightBalance = streetlightPayment?.balance || 10;

    return {
      canRequestDocument: garbagePaid && streetlightPaid,
      garbageFee: {
        paid: garbagePaid,
        balance: garbageBalance,
        status: garbagePayment?.status || 'unpaid'
      },
      streetlightFee: {
        paid: streetlightPaid,
        balance: streetlightBalance,
        status: streetlightPayment?.status || 'unpaid'
      },
      currentMonth: currentMonth
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
  getCurrentMonthKey
};